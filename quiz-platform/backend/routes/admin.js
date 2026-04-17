const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getDb } = require('../db/init');
const { generateCode } = require('../lib/codes');
const { parseParticipantsCsv } = require('../lib/csvParticipants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden — invalid or missing admin token' });
  }
  next();
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function computeUserRow(db, row) {
  const modules = db.prepare('SELECT id FROM modules WHERE quiz_id = ?').all(row.quiz_id);
  const totalModules = modules.length;

  const attempts = db
    .prepare(
      `
    SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
    FROM attempts
    WHERE user_id = ? AND quiz_id = ? AND campaign_id = ?
    ORDER BY completed_at ASC
  `
    )
    .all(row.user_id, row.quiz_id, row.campaign_id);

  const completedModuleIds = new Set(attempts.map(a => a.module_id));
  const completedModules = completedModuleIds.size;

  let status = 'not_started';
  if (completedModules >= totalModules && totalModules > 0) status = 'completed';
  else if (completedModules > 0) status = 'in_progress';

  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalTime = attempts.reduce((s, a) => s + a.time_spent_seconds, 0);
  const avgScore = attempts.length > 0 ? totalScore / attempts.length : 0;
  const maxAttempt = attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0;
  const lastCompleted = attempts.length > 0 ? attempts[attempts.length - 1].completed_at : null;

  const deadline = row.campaign_deadline || row.quiz_deadline;

  return {
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    campaign_deadline: row.campaign_deadline,
    quiz_id: row.quiz_id,
    quiz_name: row.quiz_name,
    quiz_deadline: row.quiz_deadline,
    deadline,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    unique_code: row.unique_code,
    supervisor_name: row.supervisor_name || '',
    supervisor_email: row.supervisor_email || '',
    status,
    completed_modules: completedModules,
    total_modules: totalModules,
    avg_score: Math.round(avgScore * 100) / 100,
    total_time: totalTime,
    attempts: maxAttempt,
    completion_date: lastCompleted
  };
}

router.get('/quizzes', requireAdmin, (req, res) => {
  const db = getDb();
  const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY id').all();
  const out = quizzes.map(q => {
    const n = db.prepare('SELECT COUNT(*) AS c FROM modules WHERE quiz_id = ?').get(q.id).c;
    return { ...q, module_count: n };
  });
  res.json({ quizzes: out });
});

router.get('/campaigns', requireAdmin, (req, res) => {
  const db = getDb();
  const campaigns = db
    .prepare(
      `
    SELECT c.*, q.name AS quiz_name
    FROM campaigns c
    JOIN quizzes q ON q.id = c.quiz_id
    ORDER BY c.id DESC
  `
    )
    .all();
  const withCounts = campaigns.map(c => {
    const n = db.prepare('SELECT COUNT(*) AS c FROM campaign_users WHERE campaign_id = ?').get(c.id).c;
    return { ...c, participant_count: n };
  });
  res.json({ campaigns: withCounts });
});

router.post('/campaigns', requireAdmin, (req, res) => {
  const { name, quiz_id, deadline } = req.body;
  if (!name || !quiz_id) {
    return res.status(400).json({ error: 'name and quiz_id are required' });
  }
  const db = getDb();
  const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(parseInt(quiz_id, 10));
  if (!quiz) {
    return res.status(404).json({ error: 'quiz not found' });
  }
  const r = db
    .prepare('INSERT INTO campaigns (name, quiz_id, deadline) VALUES (?, ?, ?)')
    .run(name, parseInt(quiz_id, 10), deadline || null);
  const created = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(r.lastInsertRowid);
  res.json({ success: true, campaign: created });
});

router.put('/campaigns/:id/deadline', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { deadline } = req.body;
  const db = getDb();
  const c = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(id);
  if (!c) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  db.prepare('UPDATE campaigns SET deadline = ? WHERE id = ?').run(deadline, id);
  res.json({ success: true, message: 'Deadline updated' });
});

router.post('/campaigns/:id/import', requireAdmin, upload.single('file'), (req, res) => {
  const campaignId = parseInt(req.params.id, 10);
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'Missing file (field name: file)' });
  }

  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const { rows, errors: parseErrors } = parseParticipantsCsv(req.file.buffer);
  const importErrors = [...parseErrors];
  let usersCreated = 0;
  let enrollmentsCreated = 0;
  let enrollmentsUpdated = 0;

  const insertUser = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const updateUserName = db.prepare('UPDATE users SET name = ? WHERE id = ?');
  const insertCu = db.prepare(`
    INSERT INTO campaign_users (campaign_id, user_id, unique_code, supervisor_name, supervisor_email)
    VALUES (?, ?, ?, ?, ?)
  `);
  const updateCu = db.prepare(`
    UPDATE campaign_users SET supervisor_name = ?, supervisor_email = ?
    WHERE campaign_id = ? AND user_id = ?
  `);
  const findUserByEmail = db.prepare('SELECT * FROM users WHERE lower(trim(email)) = ?');

  const tx = db.transaction(() => {
    const seenEmails = new Set();
    for (const r of rows) {
      const em = normalizeEmail(r.email);
      if (seenEmails.has(em)) {
        importErrors.push(`Doublon ignoré dans le fichier : ${r.email}`);
        continue;
      }
      seenEmails.add(em);

      let user = findUserByEmail.get(em);
      if (!user) {
        const ins = insertUser.run(r.email.trim(), r.name.trim());
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(ins.lastInsertRowid);
        usersCreated += 1;
      } else {
        updateUserName.run(r.name.trim(), user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }

      const existing = db
        .prepare('SELECT id FROM campaign_users WHERE campaign_id = ? AND user_id = ?')
        .get(campaignId, user.id);

      if (existing) {
        updateCu.run(
          r.supervisor_name || null,
          r.supervisor_email || null,
          campaignId,
          user.id
        );
        enrollmentsUpdated += 1;
      } else {
        insertCu.run(
          campaignId,
          user.id,
          generateCode(),
          r.supervisor_name || null,
          r.supervisor_email || null
        );
        enrollmentsCreated += 1;
      }
    }
  });

  try {
    tx();
  } catch (e) {
    return res.status(400).json({ error: String(e.message || e) });
  }

  res.json({
    success: true,
    rows_in_file: rows.length,
    users_created: usersCreated,
    enrollments_created: enrollmentsCreated,
    enrollments_updated: enrollmentsUpdated,
    warnings: importErrors
  });
});

router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id, 10) : null;

  const campaigns = db
    .prepare(
      `
    SELECT c.*, q.name AS quiz_name, q.deadline AS quiz_deadline
    FROM campaigns c
    JOIN quizzes q ON q.id = c.quiz_id
    ORDER BY c.id DESC
  `
    )
    .all();

  let sql = `
    SELECT
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.deadline AS campaign_deadline,
      q.id AS quiz_id,
      q.name AS quiz_name,
      q.deadline AS quiz_deadline,
      u.id AS user_id,
      u.name,
      u.email,
      cu.unique_code,
      cu.supervisor_name,
      cu.supervisor_email
    FROM campaign_users cu
    JOIN campaigns c ON c.id = cu.campaign_id
    JOIN quizzes q ON q.id = c.quiz_id
    JOIN users u ON u.id = cu.user_id
  `;
  const params = [];
  if (campaignId) {
    sql += ' WHERE c.id = ?';
    params.push(campaignId);
  }
  sql += ' ORDER BY c.id DESC, u.name ASC';

  const raw = db.prepare(sql).all(...params);
  const results = raw.map(row => computeUserRow(db, row));

  res.json({ campaigns, users: results });
});

router.get('/export.csv', requireAdmin, (req, res) => {
  const db = getDb();
  const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id, 10) : null;

  let sql = `
    SELECT
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.deadline AS campaign_deadline,
      q.id AS quiz_id,
      q.name AS quiz_name,
      q.deadline AS quiz_deadline,
      u.id AS user_id,
      u.name,
      u.email,
      cu.unique_code,
      cu.supervisor_name,
      cu.supervisor_email
    FROM campaign_users cu
    JOIN campaigns c ON c.id = cu.campaign_id
    JOIN quizzes q ON q.id = c.quiz_id
    JOIN users u ON u.id = cu.user_id
  `;
  const params = [];
  if (campaignId) {
    sql += ' WHERE c.id = ?';
    params.push(campaignId);
  }
  sql += ' ORDER BY c.id DESC, u.name ASC';

  const raw = db.prepare(sql).all(...params);

  const rows = [
    [
      'Campaign',
      'Quiz',
      'Name',
      'Email',
      'Supervisor',
      'Supervisor Email',
      'Status',
      'Modules Completed',
      'Total Modules',
      'Avg Score',
      'Total Time (s)',
      'Attempts',
      'Completion Date'
    ]
  ];

  for (const row of raw) {
    const u = computeUserRow(db, row);
    rows.push([
      u.campaign_name,
      u.quiz_name,
      u.name,
      u.email,
      u.supervisor_name,
      u.supervisor_email,
      u.status,
      u.completed_modules,
      u.total_modules,
      u.avg_score,
      u.total_time,
      u.attempts,
      u.completion_date || ''
    ]);
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz-export.csv"');
  res.send('\uFEFF' + csv);
});

router.put('/quiz/:id/deadline', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { deadline } = req.body;

  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(parseInt(id, 10));
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('UPDATE quizzes SET deadline = ? WHERE id = ?').run(deadline, parseInt(id, 10));
  res.json({ success: true, message: 'Deadline updated' });
});

module.exports = router;
