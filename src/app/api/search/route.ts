import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const project = searchParams.get("project");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  if (!q) {
    return NextResponse.json({ error: "Missing query param 'q'" }, { status: 400 });
  }

  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  let sql: string;
  let params: (string | number)[];

  if (project && project !== "all") {
    sql = `
      SELECT snippet(search_index, 3, '<mark>', '</mark>', '', 40) as snippet,
             search_index.date, search_index.source, search_index.type,
             search_index.project, search_index.session_id
      FROM search_index
      WHERE search_index MATCH ? AND search_index.project = ?
      ORDER BY rank
      LIMIT ?
    `;
    params = [q, project, limit];
  } else {
    sql = `
      SELECT snippet(search_index, 3, '<mark>', '</mark>', '', 40) as snippet,
             search_index.date, search_index.source, search_index.type,
             search_index.project, search_index.session_id
      FROM search_index
      WHERE search_index MATCH ?
      ORDER BY rank
      LIMIT ?
    `;
    params = [q, limit];
  }

  const results = db.prepare(sql).all(...params);

  const countSql = `SELECT count(*) as total FROM search_index WHERE search_index MATCH ?`;
  const { total } = db.prepare(countSql).get(q) as { total: number };

  db.close();

  return NextResponse.json({ query: q, total, results });
}
