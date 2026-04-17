const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { resolveParticipantByCode } = require('../lib/resolveCode');

router.post('/submit', (req, res) => {
  const { code, module_id, score, time_spent_seconds, attempt_number } = req.body;

  if (!code || module_id == null || score == null) {
    return res.status(400).json({ error: 'code, module_id, and score are required' });
  }

  const db = getDb();
  const resolved = resolveParticipantByCode(db, code);
  if (!resolved) {
    return res.status(401).json({ error: 'invalid_code' });
  }

  const { user, quiz, campaign } = resolved;

  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(module_id);
  if (!mod) {
    return res.status(404).json({ error: 'invalid_module' });
  }

  if (mod.quiz_id !== quiz.id) {
    return res.status(400).json({ error: 'module_not_in_campaign' });
  }

  const timeSpent = time_spent_seconds || 0;

  const prevAttempts = db
    .prepare(
      `
    SELECT MAX(attempt_number) as max_attempt FROM attempts
    WHERE user_id = ? AND quiz_id = ? AND module_id = ? AND campaign_id = ?
  `
    )
    .get(user.id, mod.quiz_id, module_id, campaign.id);

  const nextAttempt = prevAttempts && prevAttempts.max_attempt ? prevAttempts.max_attempt + 1 : 1;
  const attemptNum = attempt_number || nextAttempt;

  db.prepare(
    `
    INSERT INTO attempts (user_id, quiz_id, module_id, score, time_spent_seconds, attempt_number, campaign_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(user.id, mod.quiz_id, module_id, score, timeSpent, attemptNum, campaign.id);

  res.json({ success: true, message: 'Answer submitted', attempt_number: attemptNum });
});

router.get('/progress/:code', (req, res) => {
  const { code } = req.params;
  const db = getDb();

  const resolved = resolveParticipantByCode(db, code);
  if (!resolved) {
    return res.status(401).json({ error: 'invalid_code' });
  }

  const { user, quiz, campaign } = resolved;

  const modules = db
    .prepare(
      `
    SELECT id, title, position FROM modules WHERE quiz_id = ? ORDER BY position ASC
  `
    )
    .all(quiz.id);

  const attempts = db
    .prepare(
      `
    SELECT module_id, score, time_spent_seconds, attempt_number, completed_at
    FROM attempts
    WHERE user_id = ? AND quiz_id = ? AND campaign_id = ?
    ORDER BY completed_at DESC
  `
    )
    .all(user.id, quiz.id, campaign.id);

  const completedModuleIds = new Set(attempts.map(a => a.module_id));
  const totalModules = modules.length;
  const completedModules = completedModuleIds.size;

  let status = 'not_started';
  if (totalModules > 0 && completedModules === totalModules) status = 'completed';
  else if (completedModules > 0) status = 'in_progress';

  const bestScores = {};
  for (const a of attempts) {
    if (!bestScores[a.module_id] || a.score > bestScores[a.module_id]) {
      bestScores[a.module_id] = a.score;
    }
  }
  const bestScoreValues = Object.values(bestScores);
  const avgBestScore =
    bestScoreValues.length > 0
      ? Math.round((bestScoreValues.reduce((s, v) => s + v, 0) / bestScoreValues.length) * 100) /
        100
      : 0;

  const totalTime = attempts.reduce((sum, a) => sum + a.time_spent_seconds, 0);

  const perModule = modules.map(m => {
    const modAttempts = attempts.filter(a => a.module_id === m.id);
    const best = modAttempts.length > 0 ? Math.max(...modAttempts.map(a => a.score)) : null;
    return {
      module_id: m.id,
      title: m.title,
      position: m.position,
      completed: modAttempts.length > 0,
      best_score: best,
      attempts: modAttempts.length
    };
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    quiz: { id: quiz.id, name: quiz.name },
    campaign: { id: campaign.id, name: campaign.name },
    status,
    completedModules,
    totalModules,
    completionPercent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
    avgBestScore,
    totalTime,
    perModule,
    attempts
  });
});

module.exports = router;
