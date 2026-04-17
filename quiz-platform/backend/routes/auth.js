const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');
const { resolveParticipantByCode } = require('../lib/resolveCode');

router.post('/start', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const db = getDb();
  const resolved = resolveParticipantByCode(db, code);
  if (!resolved) {
    return res.status(401).json({
      error: 'invalid_code',
      message: 'Lien invalide — contacte ton admin. / Invalid link — contact your admin.'
    });
  }

  const { user, quiz, campaign } = resolved;

  const modules = db
    .prepare(
      `
    SELECT id, title, position FROM modules
    WHERE quiz_id = ? ORDER BY position ASC
  `
    )
    .all(quiz.id);

  const deadline = campaign.deadline || quiz.deadline;

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

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    quiz: {
      id: quiz.id,
      name: quiz.name,
      description: quiz.description,
      deadline
    },
    campaign: { id: campaign.id, name: campaign.name, deadline: campaign.deadline },
    modules,
    attempts
  });
});

module.exports = router;
