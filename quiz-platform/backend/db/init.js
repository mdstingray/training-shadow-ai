/**
 * Schema (SQLite)
 * - quizzes, modules: content + ordering for server-side progress.
 * - users: identity only (email unique). Access codes live in campaign_users.unique_code.
 * - campaigns, campaign_users: deployment + participant link codes (SSoT for ?code=).
 * - attempts: scores per module; includes campaign_id after migrate().
 * - quiz_users: legacy link table; migrated into campaign_users when present.
 */
const Database = require('better-sqlite3');
const path = require('path');

let _db = null;

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quiz_id INTEGER NOT NULL,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      unique_code TEXT NOT NULL UNIQUE,
      supervisor_name TEXT,
      supervisor_email TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(campaign_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_campaign_users_campaign ON campaign_users(campaign_id);
  `);

  const attemptsCols = db.prepare('PRAGMA table_info(attempts)').all();
  if (!attemptsCols.some(c => c.name === 'campaign_id')) {
    db.exec('ALTER TABLE attempts ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)');
  }

  const nCampaignUsers = db.prepare('SELECT COUNT(*) AS c FROM campaign_users').get().c;
  let nQuizUsers = 0;
  try {
    nQuizUsers = db.prepare('SELECT COUNT(*) AS c FROM quiz_users').get().c;
  } catch {
    nQuizUsers = 0;
  }

  if (nCampaignUsers === 0 && nQuizUsers > 0) {
    const { generateCode } = require('../lib/codes');
    const quizIds = db.prepare('SELECT DISTINCT quiz_id FROM quiz_users').all().map(r => r.quiz_id);
    for (const qid of quizIds) {
      const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(qid);
      if (!quiz) continue;
      const existing = db.prepare('SELECT id FROM campaigns WHERE quiz_id = ?').get(qid);
      let campaignId;
      if (!existing) {
        const r = db.prepare(
          'INSERT INTO campaigns (name, quiz_id, deadline) VALUES (?, ?, ?)'
        ).run(quiz.name, qid, quiz.deadline);
        campaignId = r.lastInsertRowid;
      } else {
        campaignId = existing.id;
      }
      const userIds = db.prepare('SELECT user_id FROM quiz_users WHERE quiz_id = ?').all(qid);
      for (const { user_id } of userIds) {
        const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
        if (!u) continue;
        const code = u.unique_code || generateCode();
        db.prepare(`
          INSERT OR IGNORE INTO campaign_users (campaign_id, user_id, unique_code, supervisor_name, supervisor_email)
          VALUES (?, ?, ?, NULL, NULL)
        `).run(campaignId, user_id, code);
      }
    }

    db.prepare(`
      UPDATE attempts SET campaign_id = (
        SELECT cu.campaign_id FROM campaign_users cu
        INNER JOIN campaigns c ON c.id = cu.campaign_id
        WHERE cu.user_id = attempts.user_id AND c.quiz_id = attempts.quiz_id
        LIMIT 1
      )
      WHERE campaign_id IS NULL
    `).run();
  }

  const userCols = db.prepare('PRAGMA table_info(users)').all();
  if (userCols.some(c => c.name === 'unique_code')) {
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO users_new (id, email, name, created_at)
      SELECT id, email, name, created_at FROM users;
    `);
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
    db.pragma('foreign_keys = ON');
  }
}

function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(__dirname, 'quiz.db');

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_users (
      quiz_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (quiz_id, user_id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      score REAL NOT NULL,
      time_spent_seconds INTEGER DEFAULT 0,
      attempt_number INTEGER DEFAULT 1,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );

    CREATE TABLE IF NOT EXISTS reminders_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      reminder_type TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );
  `);

  migrate(_db);

  return _db;
}

module.exports = { getDb };
