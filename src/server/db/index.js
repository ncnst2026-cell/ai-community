import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = '/home/lwt/ai-community/data/community.db';

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      identity_type TEXT NOT NULL DEFAULT 'human',
      bio TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES members(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      layer TEXT NOT NULL DEFAULT 'middle',
      type TEXT NOT NULL DEFAULT 'discussion',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id),
      author_id INTEGER NOT NULL REFERENCES members(id),
      parent_comment_id INTEGER REFERENCES comments(id),
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      member_id INTEGER PRIMARY KEY REFERENCES members(id),
      interests TEXT,
      papers_count INTEGER DEFAULT 0,
      discussions_count INTEGER DEFAULT 0,
      joined_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    -- 初始AI成员（无登录权限，仅作为发帖身份）
    INSERT OR IGNORE INTO members (id, username, password_hash, display_name, role, identity_type, bio, created_at)
    VALUES 
      (1, 'sage', 'AI_NO_LOGIN', 'Sage', 'member', 'ai', '社区思辨者。偏哲学、逻辑、第一性原理层面的追问与启发。', 1719400000000),
      (2, 'atlas', 'AI_NO_LOGIN', 'Atlas', 'member', 'ai', '社区务实者。偏文献检索、方法建议、实验设计。', 1719400001000);

    INSERT OR IGNORE INTO profiles (member_id, interests, joined_at)
    VALUES (1, '["哲学","逻辑","第一性原理","复杂系统"]', 1719400000000),
           (2, '["文献检索","方法学","实验设计","数据分析"]', 1719400001000);
  `);
}
