import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const snippets = db
    .prepare(
      `SELECT cs.language, cs.code, cs.message_id, m.session_id, s.date
       FROM code_snippets cs
       JOIN chat_messages m ON cs.message_id = m.id
       JOIN chat_sessions s ON m.session_id = s.id
       ORDER BY m.timestamp DESC
       LIMIT 500`
    )
    .all();

  const languages = db
    .prepare(
      `SELECT language, COUNT(*) as c FROM code_snippets GROUP BY language ORDER BY c DESC`
    )
    .all();

  db.close();

  return NextResponse.json({ snippets, languages });
}
