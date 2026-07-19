"use client";

import { useEffect, useState } from "react";

interface SourceStatus {
  source: string;
  lastSync: string | null;
  canSync: boolean;
}

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<SourceStatus[]>([]);
  const [cooldown, setCooldown] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchStatus = () => {
    fetch("/api/sync")
      .then((r) => r.json())
      .then((d) => {
        setStatuses(d.statuses ?? []);
        setCooldown(d.cooldownHours ?? 10);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchStatus(); }, []);

  const doSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setResult(`Synced ${data.totalSessions} sessions, ${data.totalMessages} messages`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult("Sync request failed");
    }

    setSyncing(false);
    fetchStatus();
  };

  const anyoneCanSync = statuses.length > 0 && statuses.every((s) => s.canSync !== false) && statuses.some((s) => s.canSync);

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Sync</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Pull new data from your sources</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
        <button
          onClick={doSync}
          disabled={syncing || !anyoneCanSync}
          className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
            syncing
              ? "bg-zinc-800 text-zinc-500 cursor-wait"
              : anyoneCanSync
                ? "bg-violet-600 hover:bg-violet-500 text-white"
                : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-800"
          }`}
        >
          {syncing ? "Syncing..." : anyoneCanSync ? "Sync All Sources" : `Cooldown — wait ${cooldown}h since last sync`}
        </button>

        {result && (
          <div className={`p-3 rounded-lg text-xs ${result.startsWith("Error") ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
            {result}
          </div>
        )}

        <div className="space-y-2">
          {statuses.map((s) => (
            <div key={s.source} className="bg-[#131315] border border-[#1f1f23] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${s.canSync ? "bg-emerald-500" : "bg-zinc-600"}`} />
                <div>
                  <span className="text-sm text-zinc-300 capitalize">{s.source}</span>
                  <p className="text-[11px] text-zinc-600">
                    {s.lastSync
                      ? `Last sync: ${new Date(s.lastSync).toLocaleString()}`
                      : "Never synced"}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                s.canSync ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-zinc-500 border-zinc-800 bg-zinc-800/30"
              }`}>
                {s.canSync ? "Ready" : `Wait ${cooldown}h`}
              </span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-zinc-600 space-y-1">
          <p>Sources that support incremental sync: Kilo Code, Codex, Claude</p>
          <p>Claude Web and GitHub need full re-ingest (drop new export or run <code className="bg-zinc-800 px-1 py-0.5 rounded">pnpm ingest --source github</code>).</p>
        </div>
      </div>
    </div>
  );
}
