import fs from 'fs';
import readline from 'readline';
import path from 'path';
import os from 'os';
import { BaseParser } from './base';
import type { ParserResult } from './base';
import { parserRegistry } from './registry';

interface ClaudeEntry {
  display: string;
  pastedContents: Record<string, unknown>;
  timestamp: number;
  project: string;
  sessionId: string;
}

function msToISO(ms: number): string {
  return new Date(ms).toISOString();
}

function extractProjectName(projectPath: string): string {
  if (!projectPath || projectPath === '/') return 'global';
  const parts = projectPath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'global';
}

export class ClaudeParser extends BaseParser {
  readonly name = 'claude';
  readonly sourceDir: string;

  constructor() {
    super();
    this.sourceDir = path.join(os.homedir(), '.claude');
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const historyPath = path.join(process.cwd(), 'copies', 'claude-history.jsonl');

    if (!fs.existsSync(historyPath)) {
      return { sessions: [], messages: [], toolInvocations: [] };
    }

    const entries = await this.loadEntries(historyPath);

    const sessionMap = new Map<string, ClaudeEntry[]>();
    for (const entry of entries) {
      const group = sessionMap.get(entry.sessionId) || [];
      group.push(entry);
      sessionMap.set(entry.sessionId, group);
    }

    const sessions = [];
    const messages = [];

    for (const [sessionId, msgs] of sessionMap) {
      const sorted = msgs.sort((a, b) => a.timestamp - b.timestamp);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      sessions.push({
        source: this.name,
        externalId: sessionId,
        title: first?.display.slice(0, 120) ?? 'Untitled',
        project: extractProjectName(first?.project ?? ''),
        projectPath: first?.project,
        firstMessageAt: msToISO(first?.timestamp ?? Date.now()),
        lastMessageAt: msToISO(last?.timestamp ?? Date.now()),
        metadata: { project: first?.project },
      });

      for (const msg of sorted) {
        if (!msg.display) continue;
        messages.push({
          sessionExternalId: sessionId,
          role: 'user' as const,
          content: msg.display,
          timestamp: msToISO(msg.timestamp),
          metadata: { project: msg.project },
        });
      }
    }

    return { sessions, messages, toolInvocations: [] };
  }

  private async loadEntries(filePath: string): Promise<ClaudeEntry[]> {
    const results: ClaudeEntry[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    for await (const line of rl) {
      try {
        results.push(JSON.parse(line));
      } catch {
        continue;
      }
    }

    return results;
  }
}

parserRegistry.register('claude', ClaudeParser);
