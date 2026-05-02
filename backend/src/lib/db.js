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

try {
  db.exec('ALTER TABLE settings ADD COLUMN github_username TEXT');
} catch (_) { /* column already exists */ }

try { db.exec('ALTER TABLE users ADD COLUMN display_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN avatar_style TEXT DEFAULT \'thumbs\''); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0'); } catch (_) {}

// Groups migration
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    repo_full_name TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    FOREIGN KEY (owner_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS group_notes (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

export default db;
