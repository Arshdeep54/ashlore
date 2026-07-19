"use client";

import { useEffect, useMemo, useState } from "react";

interface Decision {
  id: number;
  session_id: string;
  date: string;
  context: string;
  decision: string;
  confidence: number;
  project: string | null;
  source: string;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [bySource, setBySource] = useState<{ source: string; c: number }[]>([]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string>("all");
  const [confidence, setConfidence] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch("/api/decisions")
      .then((r) => r.json())
      .then((d) => {
        setDecisions(d.decisions ?? []);
        setBySource(d.bySource ?? []);
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        setFrom(sevenDaysAgo);
        setTo(today);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return decisions.filter((d) => {
      if (source !== "all" && d.source !== source) return false;
      if (confidence !== "all") {
        if (confidence === "high" && d.confidence < 0.8) return false;
        if (confidence === "medium" && (d.confidence < 0.6 || d.confidence >= 0.8)) return false;
        if (confidence === "low" && d.confidence >= 0.6) return false;
      }
      if (query && !d.decision.toLowerCase().includes(query.toLowerCase()) && !d.context.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && d.date < from) return false;
      if (to && d.date > to) return false;
      return true;
    });
  }, [decisions, source, confidence, query, from, to]);

  const projectColors: Record<string, string> = { "tal-ai-agent": "text-indigo-400 border-indigo-500/30", "tal-ai-dashboard": "text-sky-400 border-sky-500/30", backend: "text-amber-400 border-amber-500/30" };
  const sourceColors: Record<string, string> = { kilo: "bg-violet-500/10 text-violet-400", codex: "bg-cyan-500/10 text-cyan-400", claude: "bg-amber-500/10 text-amber-400", "claude-web": "bg-pink-500/10 text-pink-400" };

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Decisions</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{decisions.length} decisions extracted</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search decisions..." className="w-full bg-[#131315] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all" />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors">
            <option value="all">All sources ({decisions.length})</option>
            {bySource.map((s) => (<option key={s.source} value={s.source}>{s.source} ({s.c})</option>))}
          </select>

          <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors">
            <option value="all">All confidence</option>
            <option value="high">High (≥0.8)</option>
            <option value="medium">Medium (0.6–0.8)</option>
            <option value="low">Low (&lt;0.6)</option>
          </select>

          <button onClick={() => setShowAdvanced(!showAdvanced)} className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showAdvanced ? "bg-violet-500/10 border-violet-500/30 text-violet-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}>Filters</button>
        </div>

        {showAdvanced && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors" />
            <span className="text-zinc-600 text-xs">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors" />
            <button onClick={() => { const today = new Date().toISOString().slice(0,10); const d = new Date(Date.now()-7*86400000).toISOString().slice(0,10); setFrom(d); setTo(today); }} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800">Reset</button>
          </div>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && <div className="text-center py-16"><p className="text-sm text-zinc-500">No decisions match</p></div>}

          {filtered.map((d) => (
            <div key={d.id} className="bg-[#131315] border border-[#1f1f23] rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150">
              <p className="text-sm text-zinc-200 font-medium mb-2 leading-relaxed">"{d.decision}"</p>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed italic">...{d.context}...</p>
              <div className="flex items-center gap-2 flex-wrap">
                {d.project && <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${projectColors[d.project] ?? "text-zinc-500 border-zinc-700"}`}>{d.project}</span>}
                <span className={`text-[10px] rounded px-1.5 py-0.5 ${sourceColors[d.source] ?? "bg-zinc-800/50 text-zinc-500"}`}>{d.source}</span>
                <span className="text-[10px] text-zinc-600">{d.date}</span>
                <span className={`text-[10px] rounded px-1.5 py-0.5 ${d.confidence >= 0.8 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : d.confidence >= 0.6 ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-zinc-800/50 text-zinc-500 border border-zinc-700"}`}>{Math.round(d.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
