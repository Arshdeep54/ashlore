# ashlore

> your coding lore, searchable

**ashlore** turns your AI coding conversations (Kilo Code, Codex, Claude, ChatGPT) and GitHub commits into a searchable second brain. Chat with your own work history — "how did we implement auth?" — and get answers from your actual past, not a generic LLM.

---

## How it works

```
Your AI tools → ashlore ingests everything → knowledge.db (SQLite + FTS5)
                                            ↓
                          Search, browse, chat with your history
```

---

## Quick Start

```bash
git clone git@github.com:Arshdeep54/ashlore.git
cd ashlore
pnpm install
cp ashlore.config.example.json ashlore.config.json
# edit config with your tool paths (defaults work for most setups)
echo "GEMINI_API_KEY=your-key" > .env   # free key at aistudio.google.com
pnpm db:migrate
pnpm ingest --source all     # backfill everything (~2 min for 15K messages)
pnpm enrich                  # extract skills, code snippets, links, decisions
pnpm dev                     # open http://localhost:3456
```

---

## Features

- **🗣️ RAG Chat** — "How did we implement auth?" → searches your history, streams an answer with citations
- **🔍 Full-text search** — FTS5 with highlighted snippets, project filters, date ranges
- **📊 Knowledge extraction** — Skills (36 techs detected), code snippets (7K+), links (2.8K+), decisions (53 architectural choices)
- **📅 Timeline browsing** — Calendar heatmap, day view with every session expanded
- **📤 Markdown export** — One file per day, git-trackable. Download all at once.
- **🔄 Incremental sync** — `pnpm sync` picks up only new data. UI controls with cooldown.
- **📂 Five source parsers** — Kilo Code, Codex, Claude Code, Claude Web exports, GitHub commits
- **🧩 Plugin architecture** — Add your own parser for any tool (Cursor, Windsurf, Copilot)
- **💾 Local-first** — Single SQLite file, your data never leaves your machine
- **💰 Zero cost RAG** — Gemini 3.1 Flash Lite ($0.10/M tokens). $10 lasts ~100K queries

---

## Supported Sources

| Source | Status | Messages | Format |
|--------|--------|----------|--------|
| Kilo Code | ✅ | 8,078 | SQLite (kilo.db) |
| Codex | ✅ | 7,804 | JSONL + SQLite (rollout files) |
| Claude Code | ✅ | 321 | JSONL + project sessions |
| Claude Web | ✅ | 377 | Export ZIP → conversations.json |
| GitHub | ✅ | 238 | git log across repos |
| ChatGPT | 🔜 | — | Export ZIP → conversations.json |

---

## Architecture

```
src/
├── app/              # Next.js App Router — 21 routes
│   ├── chat/         # RAG chat with model selection
│   ├── search/       # FTS5 search
│   ├── day/[date]/   # Day detail view
│   ├── skills/       # Skill tracker with timeline
│   ├── snippets/     # Code browser with copy
│   ├── links/        # URL collector grouped by domain
│   ├── decisions/    # Architectural decisions extracted from chats
│   ├── settings/     # Sync controls + source status
│   └── api/          # REST API + SSE streaming
├── core/
│   ├── parsers/      # Plugin parser system — one file per tool
│   ├── ingest/       # Pipeline: dedup (SHA256), normalize, insert
│   ├── enrich/       # Skills, code, links, decisions extraction
│   ├── db/           # SQLite schema, connection, migrations
│   ├── config/       # Zod-validated config loader
│   ├── llm/          # LLM provider abstraction (Gemini, OpenAI, Anthropic)
│   └── embed/        # Embedding provider abstraction
└── cli/              # CLI: ingest, sync, enrich, export
```

### Adding a new parser

1. Create `src/core/parsers/cursor.ts`
2. Extend `BaseParser` — implement `parse()` and `name`
3. Register in `parserRegistry` at the bottom of the file
4. Run `pnpm ingest --source cursor`

---

## CLI Commands

```bash
pnpm ingest --source all     # Full backfill from all configured sources
pnpm ingest --source kilo    # Single source backfill
pnpm sync                    # Incremental — only new data since last run
pnpm sync --source codex     # Single source incremental
pnpm enrich                  # Run skill/code/links/decisions extraction
pnpm export                  # Generate markdown to journal/ directory
pnpm dev                     # Start web UI at localhost:3456
```

---

## Configuration

`ashlore.config.json`:

```json
{
  "sources": {
    "kilo": { "enabled": true, "databasePath": "~/.local/share/kilo/kilo.db" },
    "codex": { "enabled": true, "historyPath": "~/.codex/history.jsonl", "stateDbPath": "~/.codex/state_5.sqlite" },
    "claude": { "enabled": true, "historyPath": "~/.claude/history.jsonl" },
    "claudeWeb": { "enabled": false, "exportsDir": "~/Downloads/claude-exports" },
    "github": { "enabled": true, "username": "your-username", "repos": [] }
  },
  "llm": {
    "provider": "gemini",
    "apiKey": "$GEMINI_API_KEY",
    "model": "gemini-3.1-flash-lite-preview",
    "availableModels": ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-3.1-pro-preview"]
  },
  "database": { "path": "./knowledge.db" }
}
```

Secrets use `$ENV_VAR` syntax. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/apikey).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Web | Next.js 15 + TypeScript + Tailwind CSS |
| Database | SQLite via better-sqlite3 |
| Search | SQLite FTS5 (14ms avg response) |
| LLM | Gemini 3.1 Flash Lite (default), Flash 3, Pro 3.1 |
| Streaming | Server-Sent Events (SSE) |
| CLI | Commander.js |
| Config | Zod-validated JSON |

---

## Design

- Dark, minimal, developer-focused UI
- 21 routes, pages under 2kB each
- Streaming RAG answers with source citations
- Model switcher in chat UI
- Calendar heatmap with clickable active days
- Search, filter, and date-range on every knowledge page

---

## Philosophy

- **Single file, no servers** — `knowledge.db` is your entire graph
- **Pluggable everything** — parsers, LLMs, embedding models behind interfaces
- **Local-first** — works offline, your data never leaves your machine
- **Code over comments** — self-documenting types, architecture decisions in `plan/`

---

## License

MIT
