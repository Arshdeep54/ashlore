import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  db.pragma("query_only = ON");

  const sessions = db
    .prepare(
      `SELECT id, source, project, title, message_count, first_message_at, last_message_at, metadata
       FROM chat_sessions WHERE date = ?
       ORDER BY first_message_at DESC`
    )
    .all(date);

  const sessionIds = (sessions as { id: string }[]).map((s) => s.id);

  let messages: unknown[] = [];

  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => "?").join(",");
    messages = db
      .prepare(
        `SELECT m.id, m.session_id, m.role, m.content, m.timestamp
         FROM chat_messages m
         WHERE m.session_id IN (${placeholders})
         ORDER BY m.timestamp ASC
         LIMIT 5000`
      )
      .all(...sessionIds);
  }

  const counts = db
    .prepare(
      `SELECT role, COUNT(*) as c
       FROM chat_messages m
       JOIN chat_sessions s ON m.session_id = s.id
       WHERE s.date = ?
       GROUP BY role`
    )
    .all(date) as { role: string; c: number }[];

  let userMsgs = 0;
  let assistantMsgs = 0;
  for (const row of counts) {
    if (row.role === "user") userMsgs = row.c;
    if (row.role === "assistant") assistantMsgs = row.c;
  }

  db.close();

  return NextResponse.json({
    date,
    sessions,
    messages,
    stats: {
      sessions: sessions.length,
      messages: userMsgs + assistantMsgs,
      userMessages: userMsgs,
      assistantMessages: assistantMsgs,
    },
  });
}
