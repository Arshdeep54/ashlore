import { getDb } from '../db/connection';
import type { ParserResult } from '../parsers/base';

export function getCursor(source: string): number | null {
  const db = getDb();
  const row = db
    .prepare('SELECT cursor_value FROM ingestion_cursors WHERE source = ?')
    .get(source) as { cursor_value: string } | undefined;
  return row ? parseInt(row.cursor_value, 10) : null;
}

export function saveCursor(source: string, result: ParserResult): void {
  const db = getDb();
  const timestamps = result.messages.map((m) => new Date(m.timestamp).getTime()).filter(Number.isFinite);
  if (timestamps.length === 0) return;

  const max = Math.max(...timestamps);

  db.prepare(`
    INSERT OR REPLACE INTO ingestion_cursors (source, sub_path, cursor_type, cursor_value, updated_at)
    VALUES (?, '', 'timestamp_ms', ?, datetime('now'))
  `).run(source, String(max));
}

export function getLastSyncTime(source: string): string | null {
  const db = getDb();
  const row = db
    .prepare('SELECT updated_at FROM ingestion_cursors WHERE source = ?')
    .get(source) as { updated_at: string } | undefined;
  return row?.updated_at ?? null;
}
