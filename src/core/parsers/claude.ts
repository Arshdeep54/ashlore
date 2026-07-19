import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage } from './base';
import type { AppConfig } from '../config/types';
import { parserRegistry } from './registry';

interface ClaudeHistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

interface ClaudeMessage {
  role: string;
  text: string;
  timestamp: string;
}

interface ProjectFileData {
  sessionId: string;
  projectPath: string;
  messages: ClaudeMessage[];
}

function msToISO(ms: number): string {
  return new Date(ms).toISOString();
}

function extractProjectName(projectPath: string): string {
  if (!projectPath || projectPath === '/') return 'global';
  const parts = projectPath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'global';
}

function projectPathFromDir(dirName: string): string {
  return '/' + dirName.replace(/-/g, '/').slice(1);
}

export class ClaudeParser extends BaseParser {
  readonly name = 'claude';
  readonly sourceDir: string;
  private historyPath: string;
  private projectsDir: string;

  constructor(config: AppConfig) {
    super();
    this.sourceDir = config.sources.claude.historyPath;
    this.historyPath = config.sources.claude.historyPath.replace(/^~/, process.env.HOME || '/home');
    this.projectsDir = config.sources.claude.projectsDir.replace(/^~/, process.env.HOME || '/home');

    if (!fs.existsSync(this.historyPath)) {
      throw new Error(
        `Claude history not found at ${this.historyPath}. Check sources.claude.historyPath in ashlore.config.json`
      );
    }
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const historyEntries = await this.loadHistoryJsonl(this.historyPath);

    const historySessionIds = new Set(historyEntries.map((e) => e.sessionId));

    const projectFiles = fs.existsSync(this.projectsDir)
      ? await this.loadAllProjectFiles(this.projectsDir)
      : [];

    const sessions: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];

    const matchedProjectIds = new Set<string>();

    for (const pf of projectFiles) {
      if (historySessionIds.has(pf.sessionId)) {
        matchedProjectIds.add(pf.sessionId);
      }
    }

    const sessionsById = new Map<string, ClaudeHistoryEntry[]>();
    for (const entry of historyEntries) {
      const arr = sessionsById.get(entry.sessionId) ?? [];
      arr.push(entry);
      sessionsById.set(entry.sessionId, arr);
    }

    for (const [sessionId, entries] of sessionsById) {
      const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
      const projectMsgs = projectFiles.find((pf) => pf.sessionId === sessionId);

      let firstTs: number;
      let lastTs: number;
      let msgs: ClaudeMessage[];
      let msgSource: string;

      if (projectMsgs) {
        const timestamps = projectMsgs.messages
          .map((m) => new Date(m.timestamp).getTime())
          .filter((t) => !isNaN(t));
        firstTs = timestamps.length > 0 ? Math.min(...timestamps) : sorted[0]?.timestamp ?? Date.now();
        lastTs = timestamps.length > 0 ? Math.max(...timestamps) : sorted[sorted.length - 1]?.timestamp ?? Date.now();
        msgs = projectMsgs.messages;
        msgSource = 'project_file';
      } else {
        firstTs = sorted[0]?.timestamp ?? Date.now();
        lastTs = sorted[sorted.length - 1]?.timestamp ?? Date.now();
        msgs = sorted.map((e) => ({
          role: 'user',
          text: e.display,
          timestamp: msToISO(e.timestamp),
        }));
        msgSource = 'history_jsonl';
      }

      sessions.push({
        source: this.name,
        externalId: sessionId,
        title: sorted[0]?.display.slice(0, 120) ?? 'Untitled',
        project: extractProjectName(sorted[0]?.project ?? '/'),
        projectPath: sorted[0]?.project ?? '/',
        firstMessageAt: msToISO(firstTs),
        lastMessageAt: msToISO(lastTs),
        metadata: { msgSource },
      });

      for (const msg of msgs) {
        if (!msg.text) continue;
        messages.push({
          sessionExternalId: sessionId,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.text,
          timestamp: msg.timestamp,
          metadata: { source: msgSource },
        });
      }
    }

    for (const pf of projectFiles) {
      if (matchedProjectIds.has(pf.sessionId)) continue;

      const timestamps = pf.messages
        .map((m) => new Date(m.timestamp).getTime())
        .filter((t) => !isNaN(t));
      const firstTs = timestamps[0] ?? Date.now();
      const lastTs = timestamps[timestamps.length - 1] ?? Date.now();

      const userMsgs = pf.messages.filter((m) => m.role === 'user');
      const title = userMsgs[0]?.text.slice(0, 120) ?? 'Untitled';

      sessions.push({
        source: this.name,
        externalId: pf.sessionId,
        title,
        project: extractProjectName(pf.projectPath),
        projectPath: pf.projectPath,
        firstMessageAt: msToISO(firstTs),
        lastMessageAt: msToISO(lastTs),
        metadata: { msgSource: 'project_file_only' },
      });

      for (const msg of pf.messages) {
        if (!msg.text) continue;
        messages.push({
          sessionExternalId: pf.sessionId,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.text,
          timestamp: msg.timestamp,
          metadata: { source: 'project_file' },
        });
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }

  private async loadHistoryJsonl(filePath: string): Promise<ClaudeHistoryEntry[]> {
    const results: ClaudeHistoryEntry[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);
        results.push({
          display: entry.display ?? '',
          timestamp: entry.timestamp ?? 0,
          project: entry.project ?? '/',
          sessionId: entry.sessionId ?? '',
        });
      } catch {
        continue;
      }
    }

    return results;
  }

  private async loadAllProjectFiles(projectsDir: string): Promise<ProjectFileData[]> {
    const results: ProjectFileData[] = [];
    const files = this.findProjectFiles(projectsDir);

    for (const filePath of files) {
      const dirName = path.basename(path.dirname(filePath));
      const projectPath = projectPathFromDir(dirName);
      const messages: ClaudeMessage[] = [];
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream });

      let currentSessionId = '';

      for await (const line of rl) {
        try {
          const entry = JSON.parse(line);

          if (entry.sessionId) {
            currentSessionId = entry.sessionId;
          }

          const entryType = entry.type;
          if (entryType === 'user' || entryType === 'assistant' || entryType === 'system') {
            let text = '';

            if (entry.message?.content) {
              if (Array.isArray(entry.message.content)) {
                text = entry.message.content
                  .filter((c: { type?: string }) => c.type === 'text')
                  .map((c: { text?: string }) => c.text ?? '')
                  .filter(Boolean)
                  .join('\n');
              } else if (typeof entry.message.content === 'string') {
                text = entry.message.content;
              }
            }

            if (text) {
              messages.push({
                role: entryType,
                text,
                timestamp: entry.timestamp ?? new Date().toISOString(),
              });
            }
          }
        } catch {
          continue;
        }
      }

      if (messages.length > 0 && currentSessionId) {
        results.push({
          sessionId: currentSessionId,
          projectPath,
          messages,
        });
      }
    }

    return results;
  }

  private findProjectFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(d: string) {
      if (!fs.existsSync(d)) return;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('subagents')) {
          walk(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          files.push(fullPath);
        }
      }
    }

    walk(dir);
    return files;
  }
}

parserRegistry.register('claude', ClaudeParser);
