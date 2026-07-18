import { sqliteTable, integer, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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
