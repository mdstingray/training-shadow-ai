/**
 * Resolve a participant link code to user, campaign, and quiz context.
 * @returns {null | { user: object, campaign: object, quiz: object, campaignUser: object }}
 */
function resolveParticipantByCode(db, code) {
  const row = db
    .prepare(
      `
    SELECT cu.id AS cu_id,
           cu.campaign_id,
           cu.user_id,
           cu.unique_code,
           cu.supervisor_name,
           cu.supervisor_email,
           c.quiz_id,
           c.name AS campaign_name,
           c.deadline AS campaign_deadline,
           u.email,
           u.name AS user_name
    FROM campaign_users cu
    JOIN campaigns c ON c.id = cu.campaign_id
    JOIN users u ON u.id = cu.user_id
    WHERE cu.unique_code = ?
  `
    )
    .get(code);

  if (!row) return null;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(row.quiz_id);
  if (!quiz) return null;

  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(row.user_id);

  return {
    user,
    quiz,
    campaign: {
      id: row.campaign_id,
      name: row.campaign_name,
      deadline: row.campaign_deadline
    },
    campaignUser: {
      id: row.cu_id,
      unique_code: row.unique_code,
      supervisor_name: row.supervisor_name,
      supervisor_email: row.supervisor_email
    }
  };
}

module.exports = { resolveParticipantByCode };
