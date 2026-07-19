import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const stats = db
    .prepare(
      `SELECT COUNT(DISTINCT id) as sessions, COUNT(*) as messages,
              SUM(CASE WHEN role='user' THEN 1 ELSE 0 END) as user_msgs,
              SUM(CASE WHEN role='assistant' THEN 1 ELSE 0 END) as assistant_msgs
       FROM chat_messages`
    )
    .get() as { sessions: number; messages: number; user_msgs: number; assistant_msgs: number };

  const bySource = db
    .prepare(
      `SELECT source, COUNT(*) as cnt FROM chat_sessions GROUP BY source ORDER BY cnt DESC`
    )
    .all() as { source: string; cnt: number }[];

  const dateRange = db
    .prepare(
      `SELECT MIN(date) as first, MAX(date) as last FROM chat_sessions`
    )
    .get() as { first: string; last: string };

  db.close();

  return NextResponse.json({ stats, bySource, dateRange });
}
