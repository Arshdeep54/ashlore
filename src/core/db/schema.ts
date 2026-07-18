import { sqliteTable, integer, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const SCHEMA_VERSION = 1;

export const MIGRATIONS: Record<number, string[]> = {
  1: [
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
      session_id TEXT NOT NULL,
      source TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT UNIQUE,
      timestamp TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tool_invocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      tool_input TEXT,
      tool_output TEXT,
      timestamp TEXT,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
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
  ],
};

export const ingestionRuns = sqliteTable('ingestion_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runType: text('run_type').notNull(),
  startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
  sourcesProcessed: integer('sources_processed').default(0),
  sessionsIngested: integer('sessions_ingested').default(0),
  messagesIngested: integer('messages_ingested').default(0),
});

export const ingestionCursors = sqliteTable(
  'ingestion_cursors',
  {
    source: text('source').notNull(),
    subPath: text('sub_path').notNull().default(''),
    cursorType: text('cursor_type').notNull(),
    cursorValue: text('cursor_value').notNull(),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    pk: uniqueIndex('pk_cursors').on(table.source, table.subPath),
  })
);

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  externalId: text('external_id'),
  date: text('date').notNull(),
  title: text('title'),
  project: text('project'),
  projectPath: text('project_path'),
  messageCount: integer('message_count').default(0),
  sourceFile: text('source_file'),
  firstMessageAt: text('first_message_at'),
  lastMessageAt: text('last_message_at'),
  metadata: text('metadata'),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id),
  source: text('source').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(),
  timestamp: text('timestamp').notNull(),
  metadata: text('metadata'),
});

export const toolInvocations = sqliteTable('tool_invocations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id),
  messageId: integer('message_id'),
  toolName: text('tool_name').notNull(),
  toolInput: text('tool_input'),
  toolOutput: text('tool_output'),
  timestamp: text('timestamp'),
});

export const githubCommits = sqliteTable('github_commits', {
  sha: text('sha').primaryKey(),
  repo: text('repo').notNull(),
  date: text('date').notNull(),
  message: text('message').notNull(),
  filesChanged: integer('files_changed').default(0),
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  diffSummary: text('diff_summary'),
});

export const dailyEntries = sqliteTable('daily_entries', {
  date: text('date').primaryKey(),
  sessionsCount: integer('sessions_count').default(0),
  messagesCount: integer('messages_count').default(0),
  commitsCount: integer('commits_count').default(0),
  toolInvocationsCount: integer('tool_invocations_count').default(0),
  topics: text('topics'),
  summary: text('summary'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const dailyActivity = sqliteTable('daily_activity', {
  date: text('date').primaryKey(),
  score: real('score').default(0),
  sessions: integer('sessions').default(0),
  messages: integer('messages').default(0),
  commits: integer('commits').default(0),
});

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').unique().notNull(),
  category: text('category'),
  firstSeenDate: text('first_seen_date'),
  lastSeenDate: text('last_seen_date'),
  mentionCount: integer('mention_count').default(0),
});

export const skillReferences = sqliteTable('skill_references', {
  skillId: integer('skill_id')
    .notNull()
    .references(() => skills.id),
  referenceType: text('reference_type').notNull(),
  referenceId: integer('reference_id').notNull(),
  date: text('date').notNull(),
});

export const codeSnippets = sqliteTable('code_snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: integer('message_id')
    .notNull()
    .references(() => chatMessages.id),
  language: text('language'),
  code: text('code').notNull(),
});

export const decisions = sqliteTable('decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id),
  messageId: integer('message_id'),
  date: text('date').notNull(),
  context: text('context'),
  decision: text('decision'),
  confidence: real('confidence').default(0.5),
});
