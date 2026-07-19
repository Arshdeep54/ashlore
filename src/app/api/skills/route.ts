import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const skills = db
    .prepare(
      `SELECT name, category, first_seen_date, last_seen_date, mention_count
       FROM skills ORDER BY mention_count DESC`
    )
    .all();

  db.close();

  return NextResponse.json({ skills });
}
