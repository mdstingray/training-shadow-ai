require('dotenv').config();

const path = require('path');
const { generateCode } = require('../backend/lib/codes');

if (!process.env.DB_PATH) {
  process.env.DB_PATH = path.join(__dirname, '..', 'backend', 'db', 'quiz.db');
}

const { getDb } = require('../backend/db/init');

const MODULE_TITLES = [
  { fr: 'Comment des données fuient en 30 secondes', en: 'How data leaks in 30 seconds' },
  { fr: 'Où va réellement votre prompt', en: 'Where your prompt actually goes' },
  { fr: 'Votre boîte à outils approuvée', en: 'Your approved toolbox' },
  { fr: 'Zone grise : les pièges que même les gens prudents font', en: 'Gray zone: the traps careful people fall into' },
  { fr: 'Sous pression, sans céder', en: 'Under pressure, without caving' },
  { fr: 'Votre boussole Shadow AI', en: 'Your Shadow AI compass' }
];

function refreshModuleTitles(db, quizId) {
  const updateByPos = db.prepare('UPDATE modules SET title = ? WHERE quiz_id = ? AND position = ?');
  let updated = 0;
  for (let i = 0; i < MODULE_TITLES.length; i++) {
    const m = MODULE_TITLES[i];
    const res = updateByPos.run(`${m.fr} / ${m.en}`, quizId, i + 1);
    updated += res.changes;
  }
  return updated;
}

function seed() {
  const db = getDb();

  const existingQuiz = db.prepare("SELECT id FROM quizzes WHERE name = 'Shadow AI Training'").get();
  if (existingQuiz) {
    const updated = refreshModuleTitles(db, existingQuiz.id);
    console.log('Shadow AI quiz already exists (id=' + existingQuiz.id + ').');
    console.log(`Refreshed ${updated} module title(s) to the latest content. No user/attempt data changed.`);
    console.log('To re-seed fully, delete the database file and run again.');
    return;
  }

  const quizResult = db.prepare(`
    INSERT INTO quizzes (name, description, deadline)
    VALUES (?, ?, ?)
  `).run(
    'Shadow AI Training',
    'Formation de sensibilisation au Shadow AI pour les employés Stingray. / Shadow AI awareness training for Stingray employees.',
    '2026-04-23'
  );
  const quizId = quizResult.lastInsertRowid;

  const moduleTitles = MODULE_TITLES;

  const moduleIds = [];
  for (let i = 0; i < moduleTitles.length; i++) {
    const m = moduleTitles[i];
    const result = db.prepare(`
      INSERT INTO modules (quiz_id, title, position)
      VALUES (?, ?, ?)
    `).run(quizId, `${m.fr} / ${m.en}`, i + 1);
    moduleIds.push(result.lastInsertRowid);
  }

  const campaignResult = db.prepare(`
    INSERT INTO campaigns (name, quiz_id, deadline)
    VALUES (?, ?, ?)
  `).run('Stingray Town Hall 2026', quizId, '2026-04-23');
  const campaignId = campaignResult.lastInsertRowid;

  const sampleUsers = [
    { name: 'Alice Martin', email: 'alice.martin@stingray.com' },
    { name: 'Bob Tremblay', email: 'bob.tremblay@stingray.com' },
    { name: 'Claire Dubois', email: 'claire.dubois@stingray.com' },
    { name: 'David Roy', email: 'david.roy@stingray.com' },
    { name: 'Eva Chen', email: 'eva.chen@stingray.com' }
  ];

  console.log('\n=== Shadow AI Quiz Platform — Seed ===\n');
  console.log(`Quiz created: "${moduleTitles.map(m => m.fr).join('" / "')}"  (id=${quizId})`);
  console.log(`Campaign id=${campaignId} (Stingray Town Hall 2026)`);
  console.log(`Modules: ${moduleIds.length}`);
  console.log(`\nModule IDs: ${moduleIds.join(', ')}\n`);
  console.log('--- Sample Users & Links ---\n');

  const PORT = process.env.PORT || 3000;

  const insertUser = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const insertCu = db.prepare(`
    INSERT INTO campaign_users (campaign_id, user_id, unique_code, supervisor_name, supervisor_email)
    VALUES (?, ?, ?, NULL, NULL)
  `);

  for (const u of sampleUsers) {
    const code = generateCode();
    const userResult = insertUser.run(u.email, u.name);
    insertCu.run(campaignId, userResult.lastInsertRowid, code);

    console.log(`  ${u.name} <${u.email}>`);
    console.log(`  -> http://localhost:${PORT}/quiz?code=${code}\n`);
  }

  console.log('--- Done! ---\n');
}

seed();
