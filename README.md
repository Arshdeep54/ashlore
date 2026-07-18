# lore

> your coding lore, searchable

**lore** ingests your AI coding conversations (Kilo Code, Codex, Claude, ChatGPT) and GitHub commits into a single searchable SQLite database. Ask "what do I know about auth?" and get answers from your own history.

---

## How it works

```
Your AI tools → lore ingests everything → searchable knowledge.db
                                          (SQLite + FTS5)
```

Every chat session, every message, every tool invocation — normalized, deduplicated, and indexed for full-text search. Browse by day, search by keyword, or chat with your own coding history (RAG coming soon).

---

## Quick Start

```bash
pnpm install
cp code-skills.config.example.json code-skills.config.json
# edit config with your tool paths (defaults work for most setups)
pnpm db:migrate
pnpm ingest --source all    # backfill everything
pnpm dev                    # open http://localhost:3456
```

---

## Features

- **Search everything** — FTS5 full-text search across all chat messages with highlighted snippets
- **Browse by day** — timeline view showing every session grouped by project
- **Multi-source** — Kilo Code, Codex, Claude Code with plugin parser system
- **Pluggable** — add your own parser for any AI tool (Cursor, Windsurf, Copilot, etc.)
- **Local-first** — single SQLite file, no servers, no network required
- **Configurable** — swap LLM providers (Gemini, OpenAI, Anthropic, Ollama), point to your tool directories

---

## Supported Sources

| Source | Status | Format |
|--------|--------|--------|
| Kilo Code | ✅ Working | SQLite (kilo.db) |
| Codex | ✅ Working | JSONL + SQLite |
| Claude Code | 🔜 Coming | JSONL + sessions |
| ChatGPT | 🔜 Coming | Export JSON |
| Claude Web | 🔜 Coming | Export JSON |
| GitHub | 🔜 Coming | gh CLI / API |

---

## Architecture

```
src/
├── app/           # Next.js App Router (web UI + API)
├── core/
│   ├── parsers/   # Parser plugins — one file per tool
│   ├── ingest/    # Ingestion pipeline (dedup, normalize, insert)
│   ├── db/        # SQLite schema, connection, migrations
│   ├── config/    # Configuration loader (Zod-validated)
│   ├── llm/       # LLM provider abstraction
│   └── embed/     # Embedding provider abstraction
└── cli/           # CLI entry points
```

### Adding a new source

1. Create `src/core/parsers/cursor.ts`
2. Extend `BaseParser` — implement `parse()` and `name`
3. Register in `parserRegistry` at the bottom of the file
4. Run `pnpm ingest --source cursor`

---

## Configuration

`code-skills.config.json`:

```json
{
  "sources": {
    "kilo": { "enabled": true, "databasePath": "~/.local/share/kilo/kilo.db" },
    "codex": { "enabled": true, "historyPath": "~/.codex/history.jsonl" }
  },
  "llm": { "provider": "gemini", "apiKey": "$GEMINI_API_KEY" },
  "embedding": { "provider": "ollama", "model": "nomic-embed-text" },
  "database": { "path": "./knowledge.db" }
}
```

Secrets use `$ENV_VAR` syntax. Ollama embedding is the default — zero API keys needed for offline use.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Web | Next.js 15 + TypeScript + Tailwind CSS |
| Database | SQLite via better-sqlite3 |
| Search | SQLite FTS5 |
| CLI | Commander.js |
| LLMs | Gemini, OpenAI, Anthropic, Ollama |
| Embeddings | Ollama, OpenAI, Gemini |

---

## Philosophy

- **Single file, no servers** — knowledge.db is your entire graph
- **Code over comments** — self-documenting types, docs in `docs/`
- **Pluggable everything** — parsers, LLMs, embedding models all behind interfaces
- **Local-first** — works offline, your data never leaves your machine

---

## License

MIT
