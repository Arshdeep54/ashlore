import { createHash } from 'crypto';
import { getDb } from '../db/connection';
import type { BaseParser } from '../parsers/base';

export class IngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionError';
  }
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

function sessionId(source: string, externalId: string): string {
  return hashContent(`${source}:${externalId}`);
}

export async function ingestParser(
  parser: BaseParser,
  options?: { dryRun?: boolean }
): Promise<{ sessions: number; messages: number; duplicates: number }> {
  const db = getDb();
  const result = await parser.parse();

  if (options?.dryRun) {
    return {
      sessions: result.sessions.length,
      messages: result.messages.length,
      duplicates: 0,
    };
  }

  const insertRun = db.prepare(`
    INSERT INTO ingestion_runs (run_type, sources_processed)
    VALUES ('full_backfill', 1)
  `);
  const runResult = insertRun.run();
  const runId = Number(runResult.lastInsertRowid);

  let sessionCount = 0;
  let messageCount = 0;
  let duplicateCount = 0;

  const messageMap = new Map<string, typeof result.messages>();
  for (const msg of result.messages) {
    const group = messageMap.get(msg.sessionExternalId) || [];
    group.push(msg);
    messageMap.set(msg.sessionExternalId, group);
  }

  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO chat_sessions
    (id, source, external_id, date, title, project, project_path,
     message_count, first_message_at, last_message_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT OR IGNORE INTO chat_messages
    (session_id, source, role, content, content_hash, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTool = db.prepare(`
    INSERT INTO tool_invocations
    (session_id, message_id, tool_name, tool_input, tool_output, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertSearch = db.prepare(`
    INSERT INTO search_index (date, source, type, content, session_id, project)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const sess of result.sessions) {
    const sid = sessionId(parser.name, sess.externalId);
    const msgs = messageMap.get(sess.externalId) || [];

    insertSession.run(
      sid,
      parser.name,
      sess.externalId,
      sess.firstMessageAt.slice(0, 10),
      sess.title,
      sess.project ?? null,
      sess.projectPath ?? null,
      msgs.length,
      sess.firstMessageAt,
      sess.lastMessageAt,
      sess.metadata ? JSON.stringify(sess.metadata) : null
    );

    sessionCount++;

    for (const msg of msgs) {
      const hash = hashContent(msg.content);

      const msgResult = insertMessage.run(
        sid,
        parser.name,
        msg.role,
        msg.content,
        hash,
        msg.timestamp,
        msg.metadata ? JSON.stringify(msg.metadata) : null
      );

      if (msgResult.changes > 0) {
        messageCount++;

        insertSearch.run(
          msg.timestamp.slice(0, 10),
          parser.name,
          'chat_message',
          msg.content,
          sid,
          sess.project ?? ''
        );
      } else {
        duplicateCount++;
      }
    }
  }

  for (const tool of result.toolInvocations) {
    const sid = sessionId(parser.name, tool.sessionExternalId);
    insertTool.run(sid, null, tool.toolName, tool.toolInput ?? null, tool.toolOutput ?? null, tool.timestamp);
  }

  db.prepare(`
    UPDATE ingestion_runs
    SET completed_at = datetime('now'),
        sessions_ingested = ?,
        messages_ingested = ?
    WHERE id = ?
  `).run(sessionCount, messageCount, runId);

  return { sessions: sessionCount, messages: messageCount, duplicates: duplicateCount };
}
