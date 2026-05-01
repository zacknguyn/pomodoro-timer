import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../db/database.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    duration INTEGER NOT NULL,
    intent TEXT,
    repo_name TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    pomodoro INTEGER DEFAULT 25,
    short_break INTEGER DEFAULT 5,
    long_break INTEGER DEFAULT 15,
    github_token TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Add github_token column if it doesn't exist (migration for existing DBs)
try {
  db.exec('ALTER TABLE settings ADD COLUMN github_token TEXT');
} catch (_) { /* column already exists */ }

export default db;
