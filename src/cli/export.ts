import { getDb } from '../core/db/connection';
import fs from 'fs';
import path from 'path';

const db = getDb();

const dates = db
  .prepare(
    `SELECT DISTINCT date FROM chat_sessions ORDER BY date`
  )
  .all() as { date: string }[];

const exportDir = path.join(process.cwd(), 'journal');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

for (const { date } of dates) {
  const sessions = db
    .prepare(
      `SELECT id, source, project, title, message_count, first_message_at, metadata
       FROM chat_sessions WHERE date = ? ORDER BY first_message_at`
    )
    .all(date) as any[];

  if (sessions.length === 0) continue;

  const lines: string[] = [];
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  lines.push(`# ${displayDate}`);
  lines.push('');
  lines.push(`**${sessions.length} session${sessions.length !== 1 ? 's' : ''}** across ${new Set(sessions.map((s) => s.project)).size} project${sessions.length !== 1 && new Set(sessions.map((s) => s.project)).size !== 1 ? 's' : ''}`);
  lines.push('');

  for (const session of sessions) {
    const messages = db
      .prepare(
        `SELECT role, content, timestamp, metadata
         FROM chat_messages
         WHERE session_id = ? AND role IN ('user', 'assistant')
         ORDER BY timestamp ASC
         LIMIT 100`
      )
      .all(session.id) as any[];

    if (messages.length === 0) continue;

    let modelLabel = '';
    try {
      const meta = JSON.parse(session.metadata ?? '{}');
      modelLabel = meta.model ? ` · ${meta.model}` : '';
    } catch {}

    lines.push(`## ${session.title ?? 'Untitled session'}`);
    lines.push('');
    lines.push(`**${session.project ?? 'global'}** · ${session.source}${modelLabel} · ${messages.length} messages`);
    lines.push('');

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      if (msg.role === 'user') {
        lines.push(`> **${time}**`);
        lines.push(`> ${msg.content.replace(/\n/g, '\n> ')}`);
        lines.push('');
      } else {
        lines.push(`${msg.content}`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  const filePath = path.join(exportDir, `${date}.md`);
  fs.writeFileSync(filePath, lines.join('\n'));
}

console.log(`Exported ${dates.length} days to journal/`);
