const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');

router.post('/start', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE unique_code = ?').get(code);
  if (!user) {
    return res.status(404).json({ error: 'invalid_code' });
  }

  const quizUsers = db.prepare(`
    SELECT q.* FROM quizzes q
    JOIN quiz_users qu ON qu.quiz_id = q.id
    WHERE qu.user_id = ?
  `).all(user.id);

  if (quizUsers.length === 0) {
    return res.status(404).json({ error: 'no_quiz_assigned' });
  }

  const quiz = quizUsers[0];

  const modules = db.prepare(`
    SELECT id, title, position FROM modules
    WHERE quiz_id = ? ORDER BY position ASC
  `).all(quiz.id);

  const attempts = db.prepare(`
    SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
    FROM attempts
    WHERE user_id = ? AND quiz_id = ?
    ORDER BY completed_at DESC
  `).all(user.id, quiz.id);

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    quiz: { id: quiz.id, name: quiz.name, description: quiz.description, deadline: quiz.deadline },
    modules,
    attempts
  });
});

module.exports = router;
