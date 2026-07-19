import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const decisions = db
    .prepare(
      `SELECT d.id, d.session_id, d.message_id, d.date, d.context, d.decision, d.confidence,
              s.project, s.source
       FROM decisions d
       JOIN chat_sessions s ON d.session_id = s.id
       ORDER BY d.confidence DESC, d.date DESC
       LIMIT 500`
    )
    .all();

  const bySource = db
    .prepare(
      `SELECT s.source, COUNT(*) as c
       FROM decisions d
       JOIN chat_sessions s ON d.session_id = s.id
       GROUP BY s.source ORDER BY c DESC`
    )
    .all();

  const byConfidence = db
    .prepare(
      `SELECT CASE
        WHEN confidence >= 0.8 THEN 'high'
        WHEN confidence >= 0.6 THEN 'medium'
        ELSE 'low'
      END as level, COUNT(*) as c
       FROM decisions
       GROUP BY level ORDER BY c DESC`
    )
    .all();

  db.close();

  return NextResponse.json({ decisions, bySource, byConfidence });
}
