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

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ sessions: 0, messages: 0, userMessages: 0, assistantMessages: 0, date: today });

  useEffect(() => {
    fetch(`/api/day/${stats.date}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setStats((prev) => ({ ...prev, ...data.stats }));
      })
      .catch(() => {});
  }, [stats.date]);

  const dayName = new Date(today).toLocaleDateString("en-US", {
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
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Today</p>
            <h1 className="text-lg font-semibold text-white mt-0.5">{dayName}</h1>
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
          <StatCard value={stats.userMessages} label="You" />
          <StatCard value={stats.assistantMessages} label="AI" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              {sessions.length > 0 ? "Recent Sessions" : "No sessions today"}
            </h2>
          </div>

          {sessions.length === 0 && (
            <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-8 text-center">
              <p className="text-sm text-zinc-500">
                No sessions recorded today. Run <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs">pnpm ingest --source kilo</code> to sync.
              </p>
            </div>
          )}

          {sessions.slice(0, 10).map((s) => (
            <SessionCard key={s.id} {...s} />
          ))}

          {sessions.length > 10 && (
            <Link
              href={`/day/${stats.date}`}
              className="block text-center text-xs text-zinc-500 hover:text-zinc-300 py-2"
            >
              View all {sessions.length} sessions →
            </Link>
          )}
        </div>

        <HeatmapSection />
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-[#131315] border border-[#1f1f23] rounded-lg px-4 py-3.5 hover:border-zinc-700 transition-colors duration-150">
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function SessionCard(s: Session) {
  const colors: Record<string, string> = {
    "tal-ai-agent": "text-indigo-400 border-indigo-500/30",
    "tal-ai-dashboard": "text-sky-400 border-sky-500/30",
    backend: "text-amber-400 border-amber-500/30",
    meridb: "text-emerald-400 border-emerald-500/30",
  };

  const modelInfo = (() => {
    try { return JSON.parse(s.metadata ?? "{}"); } catch { return {}; }
  })();

  return (
    <Link
      href={`/day/${s.first_message_at.slice(0, 10)}`}
      className="block bg-[#131315] border border-[#1f1f23] rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {s.project && (
              <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${colors[s.project] ?? "text-zinc-500 border-zinc-700"}`}>
                {s.project}
              </span>
            )}
            {modelInfo.model && (
              <span className="text-[10px] text-zinc-600">{modelInfo.model}</span>
            )}
          </div>
          <p className="text-sm font-medium text-zinc-200 truncate">
            {s.title !== "global" ? s.title : "Untitled session"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-500">
            {new Date(s.first_message_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">{s.message_count} msgs</p>
        </div>
      </div>
    </Link>
  );
}

function HeatmapSection() {
  return (
    <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-400">Activity</h2>
        <Link href="/day/2026-05-14" className="text-xs text-zinc-600 hover:text-zinc-400">May 14 — Today</Link>
      </div>

      <div className="space-y-2">
        {["May", "June", "July"].map((month) => {
          const days = month === "May" ? 18 : month === "July" ? 18 : 30;
          return (
            <div key={month} className="flex items-center gap-3">
              <span className="text-xs text-zinc-600 w-9">{month}</span>
              <div className="flex gap-[3px]">
                {Array.from({ length: days }).map((_, i) => {
                  const intensity = Math.random();
                  return (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-75 hover:ring-1 hover:ring-violet-400 hover:scale-125 ${
                        intensity > 0.7
                          ? "bg-violet-500"
                          : intensity > 0.4
                            ? "bg-violet-500/50"
                            : intensity > 0.1
                              ? "bg-violet-500/20"
                              : "bg-zinc-800"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
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
