import Database from 'better-sqlite3';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage } from './base';
import type { AppConfig } from '../config/types';
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
  rollout_path: string;
}

interface RolloutMessage {
  role: string;
  text: string;
  timestamp: string;
}

function extractProjectName(cwd: string): string {
  if (!cwd || cwd === '/') return 'global';
  return path.basename(cwd);
}

export class CodexParser extends BaseParser {
  readonly name = 'codex';
  readonly sourceDir: string;
  private stateDb: Database.Database;

  constructor(config: AppConfig) {
    super();
    const dbPath = config.sources.codex.stateDbPath.replace(/^~/, process.env.HOME || '/home');

    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `Codex database not found at ${dbPath}. Check sources.codex.stateDbPath in lore.config.json`
      );
    }

    this.sourceDir = path.dirname(dbPath);
    this.stateDb = new Database(dbPath, { readonly: true });
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const threads = this.loadThreads();

    const sessions: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];

    for (const thread of threads) {
      const rolloutMsgs = await this.loadSingleRollout(thread.rollout_path);

      if (rolloutMsgs.length === 0) continue;

      const firstTs = rolloutMsgs[0]!.timestamp;
      const lastTs = rolloutMsgs[rolloutMsgs.length - 1]!.timestamp;

      sessions.push({
        source: this.name,
        externalId: thread.id,
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

      for (const msg of rolloutMsgs) {
        if (!msg.text) continue;
        messages.push({
          sessionExternalId: thread.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.text,
          timestamp: msg.timestamp,
          metadata: { source: 'rollout' },
        });
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }

  private loadThreads(): CodexThread[] {
    return this.stateDb
      .prepare(
        `SELECT id, title, cwd, source, model_provider, model,
                rollout_path,
                datetime(created_at, 'unixepoch') as created_at,
                datetime(updated_at, 'unixepoch') as updated_at,
                first_user_message, tokens_used
         FROM threads
         WHERE datetime(created_at, 'unixepoch') >= '2026-05-14'
         ORDER BY created_at`
      )
      .all() as CodexThread[];
  }

  private async loadSingleRollout(filePath: string): Promise<RolloutMessage[]> {
    const messages: RolloutMessage[] = [];

    if (!fs.existsSync(filePath)) return messages;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'response_item') {
          const payload = entry.payload;
          if (payload.type === 'message' && Array.isArray(payload.content)) {
            const role = payload.role ?? 'unknown';
            const text = payload.content
              .filter((c: { type: string }) => c.type === 'input_text' || c.type === 'output_text')
              .map((c: { text: string }) => c.text)
              .join('\n');

            if (text) {
              messages.push({
                role: role === 'developer' ? 'system' : role,
                text,
                timestamp: entry.timestamp ?? new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        continue;
      }
    }

    return messages;
  }
}

parserRegistry.register('codex', CodexParser);
