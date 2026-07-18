import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'knowledge.db');

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const migrations: string[] = [
  `CREATE TABLE IF NOT EXISTS ingestion_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    sources_processed INTEGER DEFAULT 0,
    sessions_ingested INTEGER DEFAULT 0,
    messages_ingested INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS ingestion_cursors (
    source TEXT NOT NULL,
    sub_path TEXT NOT NULL DEFAULT '',
    cursor_type TEXT NOT NULL,
    cursor_value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (source, sub_path)
  )`,

  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT,
    date TEXT NOT NULL,
    title TEXT,
    project TEXT,
    project_path TEXT,
    message_count INTEGER DEFAULT 0,
    source_file TEXT,
    first_message_at TEXT,
    last_message_at TEXT,
    metadata TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id),
    source TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT UNIQUE,
    timestamp TEXT NOT NULL,
    metadata TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS tool_invocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id),
    message_id INTEGER,
    tool_name TEXT NOT NULL,
    tool_input TEXT,
    tool_output TEXT,
    timestamp TEXT
  )`,

  `CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    date,
    source,
    type,
    content,
    session_id,
    project,
    tokenize='porter unicode61'
  )`,
];

const runAll = sqlite.transaction(() => {
  for (const sql of migrations) {
    sqlite.exec(sql);
  }
});

runAll();
sqlite.close();
