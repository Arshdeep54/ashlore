"use client";

import { useEffect, useMemo, useState } from "react";

interface Skill {
  name: string;
  category: string;
  first_seen_date: string;
  last_seen_date: string;
  mention_count: number;
}

const categoryColors: Record<string, string> = {
  language: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  frontend: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  backend: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  database: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  devops: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ai: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  security: "bg-red-500/10 text-red-400 border-red-500/20",
  platform: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  quality: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  tooling: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  systems: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  blockchain: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => {
        setSkills(d.skills);
        const today = new Date().toISOString().slice(0, 10);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        setFrom(sevenDaysAgo);
        setTo(today);
      })
      .catch(() => {});
  }, []);

  const categories = Array.from(new Set(skills.map((s) => s.category)));
  const maxMentions = Math.max(...skills.map((s) => s.mention_count), 1);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && s.first_seen_date < from) return false;
      if (to && s.last_seen_date > to) return false;
      return true;
    });
  }, [skills, category, query, from, to]);

  return (
    <div className="min-h-0">
      <Header skills={skills.length} />

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter skills..."
              className="w-full bg-[#131315] border border-[#1f1f23] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="capitalize">{c}</option>
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
              title="First seen after"
            />
            <span className="text-zinc-600 text-xs">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              title="Last seen before"
            />
            {(from || to) && (
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
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {filtered.map((skill) => (
            <div
              key={skill.name}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg p-4 hover:border-zinc-700 transition-colors duration-150 group"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium text-zinc-200">{skill.name}</span>
                <span className="text-[11px] text-zinc-500 tabular-nums">{skill.mention_count} mentions</span>
              </div>

              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${(skill.mention_count / maxMentions) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] border rounded px-1.5 py-0.5 capitalize ${categoryColors[skill.category] ?? "bg-zinc-800/50 text-zinc-500 border-zinc-700"}`}>
                  {skill.category}
                </span>
                <span className="text-[11px] text-zinc-600">
                  {skill.first_seen_date} → {skill.last_seen_date}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-zinc-500">No skills match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ skills }: { skills: number }) {
  return (
    <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Skills</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{skills} technologies detected</p>
        </div>
      </div>
    </div>
  );
}
