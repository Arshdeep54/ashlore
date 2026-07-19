import { getDb } from '../db/connection';

export function extractCodeSnippets(): number {
  const db = getDb();

  db.exec(`DELETE FROM code_snippets`);

  const messages = db
    .prepare('SELECT id, content FROM chat_messages')
    .all() as { id: number; content: string }[];

  const insert = db.prepare(
    'INSERT INTO code_snippets (message_id, language, code) VALUES (?, ?, ?)'
  );

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let totalSnippets = 0;

  for (const msg of messages) {
    let match;
    while ((match = codeBlockRegex.exec(msg.content)) !== null) {
      const language = match[1]?.toLowerCase() ?? 'text';
      const code = match[2]?.trim() ?? '';

      if (code.length < 3) continue;
      if (code.length > 10000) continue;

      insert.run(msg.id, language, code);
      totalSnippets++;
    }

    codeBlockRegex.lastIndex = 0;
  }

  return totalSnippets;
}
