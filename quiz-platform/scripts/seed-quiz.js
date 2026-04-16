require('dotenv').config();

const path = require('path');
const { v4: uuidv4 } = require('uuid');

if (!process.env.DB_PATH) {
  process.env.DB_PATH = path.join(__dirname, '..', 'backend', 'db', 'quiz.db');
}

const { getDb } = require('../backend/db/init');

function generateCode() {
  return uuidv4().replace(/-/g, '').substring(0, 9).toUpperCase();
}

function seed() {
  const db = getDb();

  const existingQuiz = db.prepare("SELECT id FROM quizzes WHERE name = 'Shadow AI Training'").get();
  if (existingQuiz) {
    console.log('Shadow AI quiz already exists (id=' + existingQuiz.id + '). Skipping seed.');
    console.log('To re-seed, delete the database file and run again.');
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

  const moduleTitles = [
    { fr: "Qu'est-ce que le Shadow AI ?", en: "What is Shadow AI?" },
    { fr: "Les risques réels", en: "Real Risks" },
    { fr: "Les outils approuvés", en: "Approved Tools" },
    { fr: "Le bon processus", en: "The Right Process" },
    { fr: "Scénarios pratiques", en: "Practical Scenarios" },
    { fr: "Quiz final — Vrai ou Faux", en: "Final Quiz — True or False" }
  ];

  const moduleIds = [];
  for (let i = 0; i < moduleTitles.length; i++) {
    const m = moduleTitles[i];
    const result = db.prepare(`
      INSERT INTO modules (quiz_id, title, position)
      VALUES (?, ?, ?)
    `).run(quizId, `${m.fr} / ${m.en}`, i + 1);
    moduleIds.push(result.lastInsertRowid);
  }

  const sampleUsers = [
    { name: 'Alice Martin', email: 'alice.martin@stingray.com' },
    { name: 'Bob Tremblay', email: 'bob.tremblay@stingray.com' },
    { name: 'Claire Dubois', email: 'claire.dubois@stingray.com' },
    { name: 'David Roy', email: 'david.roy@stingray.com' },
    { name: 'Eva Chen', email: 'eva.chen@stingray.com' }
  ];

  console.log('\n=== Shadow AI Quiz Platform — Seed ===\n');
  console.log(`Quiz created: "${moduleTitles.map(m => m.fr).join('" / "')}"  (id=${quizId})`);
  console.log(`Modules: ${moduleIds.length}`);
  console.log(`\nModule IDs: ${moduleIds.join(', ')}\n`);
  console.log('--- Sample Users & Links ---\n');

  const PORT = process.env.PORT || 3000;

  for (const u of sampleUsers) {
    const code = generateCode();
    const userResult = db.prepare(`
      INSERT INTO users (email, name, unique_code)
      VALUES (?, ?, ?)
    `).run(u.email, u.name, code);

    db.prepare(`
      INSERT INTO quiz_users (quiz_id, user_id)
      VALUES (?, ?)
    `).run(quizId, userResult.lastInsertRowid);

    console.log(`  ${u.name} <${u.email}>`);
    console.log(`  -> http://localhost:${PORT}/quiz?code=${code}\n`);
  }

  console.log('--- Done! ---\n');
}

seed();
