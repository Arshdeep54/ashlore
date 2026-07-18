import Database from 'better-sqlite3';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage } from './base';
import { parserRegistry } from './registry';

interface CodexThread {
  id: string;
  title: string;
  cwd: string;
  source: string;
  model_provider: string;
  model: string;
  created_at: string;
  updated_at: string;
  first_user_message: string;
  tokens_used: number;
}

interface RolloutMessage {
  role: string;
  text: string;
  timestamp: string;
}

function unixToISO(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

function extractProjectName(cwd: string): string {
  if (!cwd || cwd === '/') return 'global';
  return path.basename(cwd);
}

export class CodexParser extends BaseParser {
  readonly name = 'codex';
  readonly sourceDir: string;
  private stateDb: Database.Database;

  constructor() {
    super();
    this.sourceDir = path.join(os.homedir(), '.codex');
    const statePath = path.join(process.cwd(), 'copies', 'codex-state.sqlite');
    this.stateDb = new Database(statePath, { readonly: true });
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const threads = this.loadThreads();

    const historyMessages = await this.loadHistoryJsonl();
    const messagesByThread = new Map<string, { text: string; ts: number }[]>();
    for (const m of historyMessages) {
      const group = messagesByThread.get(m.sessionId) || [];
      group.push({ text: m.text, ts: m.ts });
      messagesByThread.set(m.sessionId, group);
    }

    const rolloutMessages = await this.loadRollouts();
    const rolloutByThread = new Map<string, RolloutMessage[]>();
    for (const [threadId, msgs] of rolloutMessages) {
      rolloutByThread.set(threadId, msgs);
    }

    const threadMap = new Map(threads.map((t) => [t.id, t]));

    const sessions: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];

    for (const [threadId, thread] of threadMap) {
      const rolloutMsgs = rolloutByThread.get(threadId) ?? [];
      const historyMsgs = messagesByThread.get(threadId) ?? [];

      if (rolloutMsgs.length === 0 && historyMsgs.length === 0) continue;

      let firstTs = '';
      let lastTs = '';

      if (rolloutMsgs.length > 0) {
        firstTs = rolloutMsgs[0].timestamp;
        lastTs = rolloutMsgs[rolloutMsgs.length - 1].timestamp;
      } else if (historyMsgs.length > 0) {
        const timestamps = historyMsgs.map((m) => m.ts);
        firstTs = unixToISO(Math.min(...timestamps));
        lastTs = unixToISO(Math.max(...timestamps));
      }

      sessions.push({
        source: this.name,
        externalId: threadId,
        title: thread.title ?? thread.first_user_message?.slice(0, 120),
        project: extractProjectName(thread.cwd),
        projectPath: thread.cwd,
        firstMessageAt: firstTs,
        lastMessageAt: lastTs,
        metadata: {
          model: thread.model ?? 'unknown',
          provider: thread.model_provider,
          cliSource: thread.source,
          tokensUsed: thread.tokens_used,
        },
      });

      if (rolloutMsgs.length > 0) {
        for (const msg of rolloutMsgs) {
          if (!msg.text) continue;
          messages.push({
            sessionExternalId: threadId,
            role: msg.role as 'user' | 'assistant',
            content: msg.text,
            timestamp: msg.timestamp,
            metadata: { source: 'rollout' },
          });
        }
      } else {
        for (const msg of historyMsgs) {
          messages.push({
            sessionExternalId: threadId,
            role: 'user',
            content: msg.text,
            timestamp: unixToISO(msg.ts),
            metadata: { source: 'history_jsonl' },
          });
        }
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }

  private loadThreads(): CodexThread[] {
    return this.stateDb
      .prepare(
        `SELECT id, title, cwd, source, model_provider, model,
                datetime(created_at, 'unixepoch') as created_at,
                datetime(updated_at, 'unixepoch') as updated_at,
                first_user_message, tokens_used
         FROM threads
         WHERE datetime(created_at, 'unixepoch') >= '2026-05-14'
         ORDER BY created_at`
      )
      .all() as CodexThread[];
  }

  private async loadHistoryJsonl(): Promise<
    { sessionId: string; ts: number; text: string }[]
  > {
    const results: { sessionId: string; ts: number; text: string }[] = [];
    const filePath = path.join(process.cwd(), 'copies', 'codex-history.jsonl');

    if (!fs.existsSync(filePath)) return results;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);
        results.push({
          sessionId: entry.session_id,
          ts: entry.ts,
          text: entry.text,
        });
      } catch {
        continue;
      }
    }

    return results;
  }

  private async loadRollouts(): Promise<Map<string, RolloutMessage[]>> {
    const result = new Map<string, RolloutMessage[]>();
    const sessionsDir = path.join(process.cwd(), 'copies', 'codex-sessions');

    if (!fs.existsSync(sessionsDir)) return result;

    const rolloutFiles = this.findRolloutFiles(sessionsDir);

    for (const filePath of rolloutFiles) {
      const sessionId = path.basename(filePath, '.jsonl').split('-').pop() ?? '';
      const messages: RolloutMessage[] = [];

      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream });

      for await (const line of rl) {
        try {
          const entry = JSON.parse(line);
          const payload = entry.payload ?? entry;

          if (entry.type === 'response_item' && payload.type === 'message') {
            const role = payload.role ?? 'unknown';

            let text = '';
            if (Array.isArray(payload.content)) {
              text = payload.content
                .filter((c: { type: string }) => c.type === 'input_text' || c.type === 'output_text')
                .map((c: { text: string }) => c.text)
                .join('\n');
            }

            if (text) {
              messages.push({
                role: role === 'developer' ? 'system' : role,
                text,
                timestamp: entry.timestamp ?? new Date().toISOString(),
              });
            }
          }

          if (payload.type === 'user_message' && payload.text) {
            messages.push({
              role: 'user',
              text: payload.text,
              timestamp: entry.timestamp ?? new Date().toISOString(),
            });
          }
        } catch {
          continue;
        }
      }

      if (messages.length > 0) {
        result.set(sessionId, messages);
      }
    }

    return result;
  }

  private findRolloutFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(d: string) {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    }

    walk(dir);
    return files;
  }
}

parserRegistry.register('codex', CodexParser);
