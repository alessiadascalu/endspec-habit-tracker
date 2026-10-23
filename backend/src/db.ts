import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../app.db');
export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    due_date TEXT,
    recurrence TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    day TEXT NOT NULL,
    base_xp INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    undone INTEGER DEFAULT 0
  );
`);

const tzRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('timezone') as { value: string } | undefined;
if (!tzRow) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('timezone', 'Europe/Bucharest');
}