"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SearchResult {
  snippet: string;
  date: string;
  source: string;
  type: string;
  project: string;
  session_id: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
    const data = await res.json();
    setResults(data.results ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your lore..."
              className="w-full bg-[#131315] border border-[#1f1f23] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 px-1.5 py-0.5 border border-zinc-700 rounded">
              ⌘K
            </span>
            {query && total > 0 && (
              <span className="absolute right-16 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500">
                {total} result{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6">
        {!query && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">
              Search across all your chat messages, decisions, and code
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#131315] border border-[#1f1f23] rounded-lg p-4 animate-pulse"
              >
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">No results for &quot;{query}&quot;</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <Link
                key={i}
                href={`/day/${r.date}`}
                className="block bg-[#131315] border border-[#1f1f23] rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {r.project && (
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400 border border-indigo-500/30 rounded px-1.5 py-0.5">
                      {r.project}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-600">{r.date}</span>
                  <span className="text-[10px] text-zinc-700">{r.source}</span>
                </div>
                <p
                  className="text-sm text-zinc-300 leading-relaxed line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
