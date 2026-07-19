"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const today = new Date().toISOString().slice(0, 10);

interface Session {
  id: string;
  source: string;
  project: string;
  title: string;
  message_count: number;
  first_message_at: string;
  metadata: string;
}

interface ActivityDay {
  date: string;
  sessions: number;
  messages: number;
  intensity: number;
}

interface Stats {
  sessions: number;
  messages: number;
  user_msgs: number;
  assistant_msgs: number;
}

interface BySource {
  source: string;
  cnt: number;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({ sessions: 0, messages: 0, user_msgs: 0, assistant_msgs: 0 });
  const [bySource, setBySource] = useState<BySource[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [dateRange, setDateRange] = useState<string>("");

  useEffect(() => {
    fetch(`/api/day/${today}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {});

    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setBySource(d.bySource ?? []);
        setDateRange(`${d.dateRange?.first ?? ""} → ${d.dateRange?.last ?? ""}`);
      })
      .catch(() => {});

    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setActivity(d.dates ?? []))
      .catch(() => {});
  }, []);

  const dayName = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{dayName}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{dateRange}</p>
          </div>
          <Link
            href="/search"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 border border-zinc-800 rounded-md"
          >
            Search ⌘K
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        <div className="grid grid-cols-4 gap-3">
          <StatCard value={stats.sessions} label="Sessions" />
          <StatCard value={stats.messages} label="Messages" />
          <StatCard value={stats.user_msgs} label="You" />
          <StatCard value={stats.assistant_msgs} label="AI" />
        </div>

        <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-5">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Sources</h2>
          <div className="space-y-2">
            {bySource.map((s) => {
              const max = bySource[0]?.cnt ?? 1;
              return (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-20 capitalize">{s.source}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${(s.cnt / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-600 tabular-nums w-8 text-right">{s.cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Heatmap activity={activity} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              {sessions.length > 0 ? "Today" : "Recent days"}
            </h2>
          </div>

          {sessions.length === 0 && (
            <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-8 text-center">
              <p className="text-sm text-zinc-500">
                No sessions today. Run <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs">pnpm ingest --source all</code> to sync.
              </p>
            </div>
          )}

          {sessions.slice(0, 10).map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}

          {sessions.length > 10 && (
            <Link
              href={`/day/${today}`}
              className="block text-center text-xs text-zinc-500 hover:text-zinc-300 py-2"
            >
              View all {sessions.length} sessions →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-[#131315] border border-[#1f1f23] rounded-lg px-4 py-3.5 hover:border-zinc-700 transition-colors duration-150">
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function SessionCard({ session: s }: { session: Session }) {
  const projectColors: Record<string, string> = {
    "tal-ai-agent": "text-indigo-400 border-indigo-500/30",
    "tal-ai-dashboard": "text-sky-400 border-sky-500/30",
    backend: "text-amber-400 border-amber-500/30",
    meridb: "text-emerald-400 border-emerald-500/30",
  };

  const sourceColors: Record<string, string> = {
    kilo: "bg-violet-500/10 text-violet-400",
    codex: "bg-cyan-500/10 text-cyan-400",
    claude: "bg-amber-500/10 text-amber-400",
    "claude-web": "bg-pink-500/10 text-pink-400",
    github: "bg-emerald-500/10 text-emerald-400",
  };

  let modelInfo: Record<string, string> = {};
  try { modelInfo = JSON.parse(s.metadata ?? "{}"); } catch {}

  return (
    <Link
      href={`/day/${s.first_message_at?.slice(0, 10) ?? ''}`}
      className="block bg-[#131315] border border-[#1f1f23] rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {s.project && (
              <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${projectColors[s.project] ?? "text-zinc-500 border-zinc-700"}`}>
                {s.project}
              </span>
            )}
            <span className={`text-[10px] rounded px-1.5 py-0.5 ${sourceColors[s.source] ?? "bg-zinc-800/50 text-zinc-500"}`}>
              {s.source}
            </span>
            {modelInfo.model && (
              <span className="text-[10px] text-zinc-600">{modelInfo.model}</span>
            )}
          </div>
          <p className="text-sm font-medium text-zinc-200 truncate">
            {s.title !== "global" ? s.title : "Untitled"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-500">
            {new Date(s.first_message_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">{s.message_count} msgs</p>
        </div>
      </div>
    </Link>
  );
}

function Heatmap({ activity }: { activity: ActivityDay[] }) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  const months = new Map<string, ActivityDay[]>();
  for (const d of activity) {
    const month = `${monthNames[new Date(d.date + "T00:00:00").getMonth()]}`;
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(d);
  }

  const formatFirst = activity[0]?.date
    ? new Date(activity[0].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const formatLast = activity[activity.length - 1]?.date
    ? new Date(activity[activity.length - 1]!.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400">Activity</h2>
        <span className="text-xs text-zinc-600">{formatFirst} — {formatLast}</span>
      </div>

      <div className="space-y-1.5">
        {Array.from(months.entries()).map(([month, monthDates]) => (
          <div key={month} className="flex items-center gap-3">
            <span className="text-xs text-zinc-600 w-9">{month}</span>
            <div className="flex gap-[3px]">
              {monthDates.map((d) => {
                const cls = d.intensity > 0.7
                  ? "bg-violet-500"
                  : d.intensity > 0.4
                    ? "bg-violet-500/50"
                    : d.intensity > 0
                      ? "bg-violet-500/20"
                      : "bg-zinc-800";
                const cell = (
                  <div
                    key={d.date}
                    className={`w-3 h-3 rounded-sm transition-all duration-75 hover:ring-1 hover:ring-violet-400 hover:scale-125 cursor-pointer ${cls}`}
                    title={`${d.date}: ${d.sessions} sessions`}
                  />
                );
                if (d.sessions > 0) {
                  return <Link key={d.date} href={`/day/${d.date}`}>{cell}</Link>;
                }
                return cell;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-600">
        Less
        <span className="w-3 h-3 rounded-sm bg-zinc-800" />
        <span className="w-3 h-3 rounded-sm bg-violet-500/20" />
        <span className="w-3 h-3 rounded-sm bg-violet-500/50" />
        <span className="w-3 h-3 rounded-sm bg-violet-500" />
        More
      </div>
    </div>
  );
}
