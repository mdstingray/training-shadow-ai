const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin token' });
  }
  next();
}

router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const quizId = req.query.quiz_id ? parseInt(req.query.quiz_id) : null;

  let quizzes = db.prepare('SELECT * FROM quizzes ORDER BY id').all();
  if (quizId) {
    quizzes = quizzes.filter(q => q.id === quizId);
  }

  const results = [];

  for (const quiz of quizzes) {
    const modules = db.prepare('SELECT id FROM modules WHERE quiz_id = ?').all(quiz.id);
    const totalModules = modules.length;

    const assignedUsers = db.prepare(`
      SELECT u.* FROM users u
      JOIN quiz_users qu ON qu.user_id = u.id
      WHERE qu.quiz_id = ?
    `).all(quiz.id);

    for (const user of assignedUsers) {
      const attempts = db.prepare(`
        SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
        FROM attempts
        WHERE user_id = ? AND quiz_id = ?
        ORDER BY completed_at ASC
      `).all(user.id, quiz.id);

      const completedModuleIds = new Set(attempts.map(a => a.module_id));
      const completedModules = completedModuleIds.size;

      let status = 'not_started';
      if (completedModules >= totalModules) status = 'completed';
      else if (completedModules > 0) status = 'in_progress';

      const totalScore = attempts.reduce((s, a) => s + a.score, 0);
      const totalTime = attempts.reduce((s, a) => s + a.time_spent_seconds, 0);
      const avgScore = attempts.length > 0 ? totalScore / attempts.length : 0;
      const maxAttempt = attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0;

      const lastCompleted = attempts.length > 0 ? attempts[attempts.length - 1].completed_at : null;

      results.push({
        quiz_id: quiz.id,
        quiz_name: quiz.name,
        quiz_deadline: quiz.deadline,
        user_id: user.id,
        name: user.name,
        email: user.email,
        unique_code: user.unique_code,
        status,
        completed_modules: completedModules,
        total_modules: totalModules,
        avg_score: Math.round(avgScore * 100) / 100,
        total_time: totalTime,
        attempts: maxAttempt,
        completion_date: lastCompleted
      });
    }
  }

  res.json({ quizzes, users: results });
});

router.get('/export.csv', requireAdmin, (req, res) => {
  const db = getDb();
  const quizId = req.query.quiz_id ? parseInt(req.query.quiz_id) : null;

  let quizzes = db.prepare('SELECT * FROM quizzes ORDER BY id').all();
  if (quizId) {
    quizzes = quizzes.filter(q => q.id === quizId);
  }

  const rows = [['Quiz', 'Name', 'Email', 'Status', 'Modules Completed', 'Total Modules', 'Avg Score', 'Total Time (s)', 'Attempts', 'Completion Date']];

  for (const quiz of quizzes) {
    const modules = db.prepare('SELECT id FROM modules WHERE quiz_id = ?').all(quiz.id);
    const totalModules = modules.length;

    const assignedUsers = db.prepare(`
      SELECT u.* FROM users u
      JOIN quiz_users qu ON qu.user_id = u.id
      WHERE qu.quiz_id = ?
    `).all(quiz.id);

    for (const user of assignedUsers) {
      const attempts = db.prepare(`
        SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
        FROM attempts WHERE user_id = ? AND quiz_id = ?
        ORDER BY completed_at ASC
      `).all(user.id, quiz.id);

      const completedModuleIds = new Set(attempts.map(a => a.module_id));
      const completedModules = completedModuleIds.size;

      let status = 'not_started';
      if (completedModules >= totalModules) status = 'completed';
      else if (completedModules > 0) status = 'in_progress';

      const totalScore = attempts.reduce((s, a) => s + a.score, 0);
      const totalTime = attempts.reduce((s, a) => s + a.time_spent_seconds, 0);
      const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length * 100) / 100 : 0;
      const maxAttempt = attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0;
      const lastCompleted = attempts.length > 0 ? attempts[attempts.length - 1].completed_at : '';

      rows.push([
        quiz.name,
        user.name,
        user.email,
        status,
        completedModules,
        totalModules,
        avgScore,
        totalTime,
        maxAttempt,
        lastCompleted
      ]);
    }
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz-export.csv"');
  res.send(csv);
});

router.put('/quiz/:id/deadline', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { deadline } = req.body;

  const db = getDb();
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(parseInt(id));
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  db.prepare('UPDATE quizzes SET deadline = ? WHERE id = ?').run(deadline, parseInt(id));
  res.json({ success: true, message: 'Deadline updated' });
});

module.exports = router;
