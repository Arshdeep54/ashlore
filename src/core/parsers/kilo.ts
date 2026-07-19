import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage, RawToolInvocation } from './base';
import type { AppConfig } from '../config/types';
import { parserRegistry } from './registry';

function msToISO(ms: number): string {
  return new Date(ms).toISOString();
}

function extractProjectName(projectPath?: string): string {
  if (!projectPath || projectPath === '/') return 'global';
  return path.basename(projectPath);
}

interface KiloProject {
  id: string;
  worktree: string;
  name: string | null;
}

interface KiloSession {
  id: string;
  project_id: string;
  title: string;
  time_created: number;
  time_updated: number;
  model: string;
  cost: number;
  tokens_input: number;
  tokens_output: number;
}

interface KiloMessage {
  id: string;
  data: string;
  time_created: number;
}

interface KiloPart {
  data: string;
}

export class KiloParser extends BaseParser {
  readonly name = 'kilo';
  readonly sourceDir: string;
  private db: Database.Database;

  constructor(config: AppConfig) {
    super();
    const configured = config.sources.kilo.databasePath;

    if (!configured) {
      throw new Error('Kilo Code: sources.kilo.databasePath is not set in ashlore.config.json');
    }

    const dbPath = configured.replace(/^~/, process.env.HOME || '/home');

    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `Kilo Code database not found at ${dbPath}. Check sources.kilo.databasePath in ashlore.config.json`
      );
    }

    this.sourceDir = path.dirname(dbPath);
    this.db = new Database(dbPath, { readonly: true });
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    return this._parse();
  }

  async parseIncremental(cursor: number): Promise<ParserResult> {
    return this._parse(cursor);
  }

  private async _parse(cursor?: number): Promise<ParserResult> {
    const projects = this.loadProjects();
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const sessions = this.loadSessions(cursor);

    const sessions_parsed: RawChatSession[] = [];
    const messages: RawChatMessage[] = [];
    const toolInvocations: RawToolInvocation[] = [];

    for (const sess of sessions) {
      const project = projectMap.get(sess.project_id);
      const modelInfo = JSON.parse(sess.model || '{}');

      sessions_parsed.push({
        source: this.name,
        externalId: sess.id,
        title: sess.title,
        project: extractProjectName(project?.worktree),
        projectPath: project?.worktree,
        firstMessageAt: msToISO(sess.time_created),
        lastMessageAt: msToISO(sess.time_updated),
        metadata: {
          model: modelInfo.modelID ?? modelInfo.id,
          provider: modelInfo.providerID,
          cost: sess.cost,
          tokensInput: sess.tokens_input,
          tokensOutput: sess.tokens_output,
        },
      });

      const sessionMessages = this.loadMessages(sess.id);

      for (const msg of sessionMessages) {
        const msgData = JSON.parse(msg.data);
        const parts = this.loadParts(msg.id);

        const textParts: string[] = [];
        const tools: RawToolInvocation[] = [];

        for (const part of parts) {
          const partData = JSON.parse(part.data);

          if (partData.type === 'text' && partData.text) {
            textParts.push(partData.text);
          }

          if (partData.type === 'tool_use') {
            tools.push({
              sessionExternalId: sess.id,
              toolName: partData.name ?? partData.tool ?? 'unknown',
              toolInput: partData.input ? JSON.stringify(partData.input) : undefined,
              timestamp: msToISO(msg.time_created),
            });
          }

          if (partData.type === 'tool_result' && partData.content) {
            const lastTool = toolInvocations[toolInvocations.length - 1];
            if (lastTool) {
              lastTool.toolOutput =
                typeof partData.content === 'string'
                  ? partData.content
                  : JSON.stringify(partData.content);
            }
          }
        }

        const content = textParts.join('\n');
        if (!content && tools.length === 0) continue;

        messages.push({
          sessionExternalId: sess.id,
          role: msgData.role ?? 'user',
          content: content || '[tool use]',
          timestamp: msToISO(msg.time_created),
          metadata: {
            model: msgData.model?.modelID,
            provider: msgData.model?.providerID,
            agent: msgData.agent,
            tokens: msgData.tokens,
            cost: msgData.cost,
          },
        });

        toolInvocations.push(...tools);
      }
    }

    return { sessions: sessions_parsed, messages, toolInvocations };
  }

  private loadProjects(): KiloProject[] {
    return this.db
      .prepare('SELECT id, worktree, name FROM project')
      .all() as KiloProject[];
  }

  private loadSessions(cursor?: number): KiloSession[] {
    const sql = cursor
      ? `SELECT id, project_id, title, time_created, time_updated, model, cost, tokens_input, tokens_output
         FROM session WHERE time_created > ? ORDER BY time_created`
      : `SELECT id, project_id, title, time_created, time_updated, model, cost, tokens_input, tokens_output
         FROM session
         WHERE datetime(time_created/1000, 'unixepoch') >= '2026-05-14'
         ORDER BY time_created`;

    return this.db.prepare(sql).all(...(cursor ? [cursor] : [])) as KiloSession[];
  }

  private loadMessages(sessionId: string): KiloMessage[] {
    return this.db
      .prepare(
        'SELECT id, data, time_created FROM message WHERE session_id = ? ORDER BY time_created'
      )
      .all(sessionId) as KiloMessage[];
  }

  private loadParts(messageId: string): KiloPart[] {
    return this.db
      .prepare('SELECT data FROM part WHERE message_id = ? ORDER BY time_created')
      .all(messageId) as KiloPart[];
  }
}

parserRegistry.register('kilo', KiloParser);
