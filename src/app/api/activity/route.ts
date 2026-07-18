import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const dates = db
    .prepare(
      `SELECT date, COUNT(*) as sessions, SUM(message_count) as messages
       FROM chat_sessions
       GROUP BY date
       ORDER BY date`
    )
    .all() as { date: string; sessions: number; messages: number }[];

  db.close();

  const map = new Map<string, { sessions: number; messages: number }>();
  for (const row of dates) {
    map.set(row.date, { sessions: row.sessions, messages: row.messages });
  }

  const firstDate = dates[0]?.date ?? new Date().toISOString().slice(0, 10);
  const start = new Date(firstDate.replace(/-/g, "/"));
  const end = new Date();
  const allDates: { date: string; sessions: number; messages: number }[] = [];

  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    const data = map.get(key);
    allDates.push({
      date: key,
      sessions: data?.sessions ?? 0,
      messages: data?.messages ?? 0,
    });
    current.setDate(current.getDate() + 1);
  }

  const max = Math.max(...allDates.map((d) => d.sessions), 1);

  for (const d of allDates) {
    (d as { intensity: number }).intensity = d.sessions / max;
  }

  return NextResponse.json({ dates: allDates, max, firstDate: allDates[0]?.date, lastDate: allDates[allDates.length - 1]?.date });
}
