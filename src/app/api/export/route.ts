import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "knowledge.db");
  const db = new Database(dbPath, { readonly: true });

  const sessions = db
    .prepare(
      `SELECT id, source, project, title, message_count, first_message_at, metadata, date
       FROM chat_sessions ORDER BY date DESC, first_message_at DESC`
    )
    .all() as any[];

  let markdown = "# lore — Export\n\n";

  let currentDate = "";

  for (const session of sessions) {
    const messages = db
      .prepare(
        `SELECT role, content, timestamp FROM chat_messages
         WHERE session_id = ? AND role IN ('user', 'assistant')
         ORDER BY timestamp ASC LIMIT 200`
      )
      .all(session.id) as any[];

    if (messages.length === 0) continue;

    if (session.date !== currentDate) {
      currentDate = session.date;
      const displayDate = new Date(session.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      markdown += `\n# ${displayDate}\n\n`;
    }

    let modelLabel = "";
    try {
      const meta = JSON.parse(session.metadata ?? "{}");
      modelLabel = meta.model ? ` · ${meta.model}` : "";
    } catch {}

    markdown += `## ${session.title ?? "Untitled"}\n\n`;
    markdown += `**${session.project ?? "global"}** · ${session.source}${modelLabel} · ${messages.length} messages\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      if (msg.role === "user") {
        markdown += `> **${time}**\n> ${msg.content.replace(/\n/g, "\n> ")}\n\n`;
      } else {
        markdown += `${msg.content}\n\n`;
      }
    }

    markdown += "---\n\n";
  }

  db.close();

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": "attachment; filename=lore-export.md",
    },
  });
}
