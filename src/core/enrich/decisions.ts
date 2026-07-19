import { getDb } from '../db/connection';

const DECISION_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /\b(decided\s+to|decided\s+on)\s+(.{10,200}?)(?:\.|$|\s+because)/i, confidence: 0.90 },
  { pattern: /\b(let'?s\s+(?:use|go\s+with))\s+(.{10,200}?)(?:\.|$|\s+for\b|\s+to\b|\s+because)/i, confidence: 0.85 },
  { pattern: /\b(I'?ll\s+go\s+with)\s+(.{10,200}?)(?:\.|$|\s+for\b|\s+to\b)/i, confidence: 0.80 },
  { pattern: /\b(switching\s+to|moved\s+to|migrated\s+to)\s+(.{10,200}?)(?:\.|$|\s+from\b|\s+for\b)/i, confidence: 0.75 },
  { pattern: /\b(better\s+to\s+use|prefer\s+(?:to\s+)?use)\s+(.{10,200}?)(?:\.|$|\s+over\b|\s+than\b)/i, confidence: 0.65 },
  { pattern: /\b(going\s+with|we\s+should\s+use?|should\s+use?)\s+(.{10,200}?)(?:\.|$|\s+for\b|\s+to\b)/i, confidence: 0.60 },
  { pattern: /\b(don'?t\s+use|avoid\s+using)\s+(.{10,200}?)(?:\.|$|\s+here\b|\s+for\b)/i, confidence: 0.55 },
];

export function extractDecisions(): number {
  const db = getDb();

  db.exec(`DELETE FROM decisions`);

  const messages = db
    .prepare(
      `SELECT m.id as message_id, m.content, m.timestamp, m.session_id, s.project, s.date
       FROM chat_messages m
       JOIN chat_sessions s ON m.session_id = s.id
       WHERE m.role = 'user'
       ORDER BY m.timestamp`
    )
    .all() as { message_id: number; content: string; timestamp: string; session_id: string; project: string | null; date: string }[];

  const insert = db.prepare(
    `INSERT INTO decisions (session_id, message_id, date, context, decision, confidence)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let count = 0;

  for (const msg of messages) {
    let bestMatch: { text: string; confidence: number } | null = null;

    for (const { pattern, confidence } of DECISION_PATTERNS) {
      const match = pattern.exec(msg.content);
      if (match) {
        const decisionText = match[0].trim();
        if (decisionText.length < 15) continue;

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { text: decisionText, confidence };
        }
      }
    }

    if (!bestMatch) continue;

    const start = msg.content.indexOf(bestMatch.text);
    const contextStart = Math.max(0, start - 100);
    const contextEnd = Math.min(msg.content.length, start + bestMatch.text.length + 100);
    const context = msg.content.slice(contextStart, contextEnd);

    insert.run(
      msg.session_id,
      msg.message_id,
      msg.date,
      context,
      bestMatch.text,
      bestMatch.confidence
    );

    count++;
  }

  return count;
}
