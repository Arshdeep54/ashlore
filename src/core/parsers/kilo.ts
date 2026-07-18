import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import { BaseParser } from './base';
import type { ParserResult, RawChatSession, RawChatMessage, RawToolInvocation } from './base';
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

  constructor() {
    super();
    this.sourceDir = path.join(os.homedir(), '.local', 'share', 'kilo');
    const copyPath = path.join(process.cwd(), 'copies', 'kilo.db');
    this.db = new Database(copyPath, { readonly: true });
  }

  canIncremental(): boolean {
    return true;
  }

  async parse(): Promise<ParserResult> {
    const projects = this.loadProjects();
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const sessions = this.loadSessions();

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

  private loadSessions(): KiloSession[] {
    return this.db
      .prepare(
        `SELECT id, project_id, title, time_created, time_updated, model, cost, tokens_input, tokens_output
         FROM session
         WHERE datetime(time_created/1000, 'unixepoch') >= '2026-05-14'
         ORDER BY time_created`
      )
      .all() as KiloSession[];
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
