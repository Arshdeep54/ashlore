"use client";

import { useEffect, useMemo, useState } from "react";

interface LinkEntry {
  url: string;
  domain: string;
  date: string;
}

export default function LinksPage() {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [domains, setDomains] = useState<{ domain: string; c: number }[]>([]);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/links")
      .then((r) => r.json())
      .then((d) => {
        setLinks(d.links ?? []);
        setDomains(d.domains ?? []);
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        setFrom(sevenDaysAgo);
        setTo(today);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return links.filter((l) => {
      if (domain !== "all" && l.domain !== domain) return false;
      if (query && !l.url.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && l.date < from) return false;
      if (to && l.date > to) return false;
      return true;
    });
  }, [links, domain, query, from, to]);

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Links</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{links.length} URLs extracted</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search URLs..."
              className="w-full bg-[#131315] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors max-w-[200px]"
          >
            <option value="all">All domains ({links.length})</option>
            {domains.map((d) => (
              <option key={d.domain} value={d.domain}>
                {d.domain} ({d.c})
              </option>
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
              onChange={(e) => setFrom(e.target.value)}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
            />
            <span className="text-zinc-600 text-xs">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
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

        {domain === "all" && domains.length > 0 && (
          <div className="bg-[#131315] border border-[#1f1f23] rounded-lg p-4">
            <h2 className="text-xs font-medium text-zinc-400 mb-3">Top domains</h2>
            <div className="flex flex-wrap gap-1.5">
              {domains.slice(0, 20).map((d) => (
                <button
                  key={d.domain}
                  onClick={() => setDomain(d.domain)}
                  className="text-[11px] px-2 py-0.5 rounded transition-colors bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                >
                  {d.domain} ({d.c})
                </button>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-500">No links match</p>
          </div>
        )}

        <div className="space-y-1.5">
          {filtered.slice(0, 100).map((link, i) => (
            <div
              key={i}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-300 hover:text-violet-400 truncate block transition-colors"
                >
                  {link.url}
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-zinc-600">{link.date}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link.url);
                    setCopied(i);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-0.5 rounded border border-zinc-800 opacity-0 group-hover:opacity-100"
                >
                  {copied === i ? "✓" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
