"use client";

import { useEffect, useMemo, useState } from "react";

interface Snippet {
  language: string;
  code: string;
  message_id: number;
  session_id: string;
  date: string;
}

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [languages, setLanguages] = useState<{ language: string; c: number }[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 20;

  useEffect(() => {
    fetch("/api/snippets")
      .then((r) => r.json())
      .then((d) => {
        setSnippets(d.snippets ?? []);
        setLanguages(d.languages ?? []);
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        setFrom(sevenDaysAgo);
        setTo(today);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return snippets.filter((s) => {
      if (filter !== "all" && s.language !== filter) return false;
      if (query && !s.code.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && s.date < from) return false;
      if (to && s.date > to) return false;
      return true;
    });
  }, [snippets, filter, query, from, to]);

  const displayed = filtered.slice(0, (page + 1) * perPage);

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Code Snippets</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{snippets.length} snippets extracted</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search in code..."
              className="w-full bg-[#131315] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <option value="all">All ({snippets.length})</option>
            {languages.slice(0, 12).map((lang) => (
              <option key={lang.language} value={lang.language}>{lang.language} ({lang.c})</option>
            ))}
          </select>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-xs px-3 py-2 rounded-lg border transition-colors ${showAdvanced ? "bg-violet-500/10 border-violet-500/30 text-violet-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
          >
            Filters
          </button>
        </div>

        {showAdvanced && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(0); }}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
            />
            <span className="text-zinc-600 text-xs">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(0); }}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
            />
            <button
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
                setFrom(sevenDaysAgo);
                setTo(today);
              }}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded border border-zinc-800 transition-colors"
            >
              Reset
            </button>
          </div>
        )}

        <div className="space-y-3">
          {displayed.map((snippet, i) => (
            <div key={i} className="bg-[#131315] border border-[#1f1f23] rounded-lg overflow-hidden group">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f1f23] bg-[#0c0c10]/50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-violet-400 border border-violet-500/30 rounded px-1.5 py-0.5">{snippet.language}</span>
                  <span className="text-[11px] text-zinc-600">{snippet.date}</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(snippet.code); setCopied(i); setTimeout(() => setCopied(null), 2000); }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-0.5 rounded border border-zinc-800 opacity-0 group-hover:opacity-100"
                >
                  {copied === i ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-4 text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                <code>{snippet.code}</code>
              </pre>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-16"><p className="text-sm text-zinc-500">No snippets match your filters</p></div>}
        </div>

        {displayed.length < filtered.length && (
          <button onClick={() => setPage((p) => p + 1)} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-[#1f1f23] rounded-lg hover:border-zinc-700 transition-colors">
            Show more ({filtered.length - displayed.length} remaining)
          </button>
        )}
      </div>
    </div>
  );
}
