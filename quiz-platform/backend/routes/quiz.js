const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');

router.post('/submit', (req, res) => {
  const { code, module_id, score, time_spent_seconds, attempt_number } = req.body;

  if (!code || module_id == null || score == null) {
    return res.status(400).json({ error: 'code, module_id, and score are required' });
  }

  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE unique_code = ?').get(code);
  if (!user) {
    return res.status(404).json({ error: 'invalid_code' });
  }

  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(module_id);
  if (!mod) {
    return res.status(404).json({ error: 'invalid_module' });
  }

  const attemptNum = attempt_number || 1;
  const timeSpent = time_spent_seconds || 0;

  db.prepare(`
    INSERT INTO attempts (user_id, quiz_id, module_id, score, time_spent_seconds, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, mod.quiz_id, module_id, score, timeSpent, attemptNum);

  res.json({ success: true, message: 'Answer submitted' });
});

router.get('/progress/:code', (req, res) => {
  const { code } = req.params;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE unique_code = ?').get(code);
  if (!user) {
    return res.status(404).json({ error: 'invalid_code' });
  }

  const quizUser = db.prepare(`
    SELECT q.* FROM quizzes q
    JOIN quiz_users qu ON qu.quiz_id = q.id
    WHERE qu.user_id = ?
  `).get(user.id);

  if (!quizUser) {
    return res.json({ user: { id: user.id, name: user.name }, quizzes: [] });
  }

  const modules = db.prepare(`
    SELECT id, title, position FROM modules
    WHERE quiz_id = ? ORDER BY position ASC
  `).all(quizUser.id);

  const attempts = db.prepare(`
    SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
    FROM attempts
    WHERE user_id = ? AND quiz_id = ?
    ORDER BY completed_at DESC
  `).all(user.id, quizUser.id);

  const completedModuleIds = new Set(attempts.map(a => a.module_id));
  const totalModules = modules.length;
  const completedModules = completedModuleIds.size;

  let status = 'not_started';
  if (completedModules === totalModules) status = 'completed';
  else if (completedModules > 0) status = 'in_progress';

  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const totalTime = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    quiz: { id: quizUser.id, name: quizUser.name },
    status,
    completedModules,
    totalModules,
    totalScore,
    totalTime,
    attempts
  });
});

module.exports = router;
