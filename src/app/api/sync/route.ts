import { NextResponse } from "next/server";
import { getDb } from "@/core/db/connection";
import { loadConfig } from "@/core/config/loader";
import { parserRegistry } from "@/core/parsers/registry";
import { ingestParser } from "@/core/ingest/pipeline";
import { getLastSyncTime } from "@/core/ingest/cursors";

import "@/core/parsers/kilo";
import "@/core/parsers/codex";
import "@/core/parsers/claude";
import "@/core/parsers/claude-web";
import "@/core/parsers/github";

const COOLDOWN_HOURS = 10;

export async function POST() {
  try {
    const config = loadConfig();
    getDb(config.database.path);

    const sources = ["kilo", "codex", "claude"];

    const results: { source: string; sessions: number; messages: number; duplicates: number }[] = [];
    let totalSessions = 0;
    let totalMessages = 0;

    for (const sourceName of sources) {
      const configKey = sourceName.replace(/-./g, (m: string) => m[1]!.toUpperCase()) as keyof typeof config.sources;
      const sourceConfig = config.sources[configKey];
      if (!sourceConfig || ("enabled" in sourceConfig && !sourceConfig.enabled)) continue;

      const parser = parserRegistry.create(sourceName, config);

      if (!parser.canIncremental()) continue;

      const result = await ingestParser(parser, { incremental: true });
      results.push({ source: sourceName, ...result });
      totalSessions += result.sessions;
      totalMessages += result.messages;
    }

    return NextResponse.json({
      success: true,
      totalSessions,
      totalMessages,
      sources: results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sources = ["kilo", "codex", "claude"];
    const statuses: { source: string; lastSync: string | null; canSync: boolean }[] = [];

    for (const name of sources) {
      const lastSync = getLastSyncTime(name);
      let canSync = true;

      if (lastSync) {
        const lastDate = new Date(lastSync).getTime();
        const now = Date.now();
        const hoursSince = (now - lastDate) / 3600000;
        canSync = hoursSince >= COOLDOWN_HOURS;
      }

      statuses.push({ source: name, lastSync, canSync });
    }

    return NextResponse.json({ statuses, cooldownHours: COOLDOWN_HOURS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get sync status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
