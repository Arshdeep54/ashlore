import Database from 'better-sqlite3';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import { getDb } from './connection';

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

function ensureVersionTable(db: Database.Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

function getCurrentVersion(db: Database.Database): number {
  ensureVersionTable(db);
  const row = db
    .prepare('SELECT MAX(version) as version FROM schema_version')
    .get() as { version: number | null };
  return row.version ?? 0;
}

function applyMigration(db: Database.Database, version: number): void {
  const statements = MIGRATIONS[version];
  if (!statements) {
    throw new MigrationError(`No migration found for version ${version}`);
  }

  const runAll = db.transaction(() => {
    for (const sql of statements) {
      db.exec(sql);
    }
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
  });

  runAll();
}

export function migrate(configPath?: string): void {
  const db = getDb();
  const currentVersion = getCurrentVersion(db);

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    applyMigration(db, v);
  }
}
