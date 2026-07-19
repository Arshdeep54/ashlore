import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const links = db
    .prepare(
      `SELECT el.url, el.domain, el.message_id, m.session_id, s.date
       FROM extracted_links el
       JOIN chat_messages m ON el.message_id = m.id
       JOIN chat_sessions s ON m.session_id = s.id
       ORDER BY m.timestamp DESC
       LIMIT 500`
    )
    .all();

  const domains = db
    .prepare(
      `SELECT domain, COUNT(*) as c FROM extracted_links GROUP BY domain ORDER BY c DESC LIMIT 30`
    )
    .all();

  db.close();

  return NextResponse.json({ links, domains });
}
