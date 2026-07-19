import { getDb } from '../db/connection';

export function extractLinks(): number {
  const db = getDb();

  db.exec(`DELETE FROM extracted_links`);

  const messages = db
    .prepare('SELECT id, content FROM chat_messages')
    .all() as { id: number; content: string }[];

  const insert = db.prepare(
    'INSERT OR IGNORE INTO extracted_links (message_id, url, domain) VALUES (?, ?, ?)'
  );

  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  let totalLinks = 0;

  for (const msg of messages) {
    let match;
    while ((match = urlRegex.exec(msg.content)) !== null) {
      const url = match[0];
      if (url.includes('...')) continue;

      let domain = '';
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = url.slice(0, 50);
      }

      insert.run(msg.id, url, domain);
      totalLinks++;
    }
    urlRegex.lastIndex = 0;
  }

  return totalLinks;
}
