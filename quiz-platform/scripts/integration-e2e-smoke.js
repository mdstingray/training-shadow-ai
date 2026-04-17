/**
 * Smoke E2E — run from quiz-platform: node scripts/integration-e2e-smoke.js
 */
const puppeteer = require('puppeteer');
const CLAIRE = process.env.CLAIRE_CODE || 'DD530FDC2';
const BASE = process.env.BASE || 'http://localhost:3000';

const results = { pass: [], fail: [] };

function record(id, cond, msg) {
  if (cond) results.pass.push(`${id}: ${msg}`);
  else results.fail.push(`${id}: ${msg}`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/quiz`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.error-screen', { timeout: 5000 });
  const err1 = await page.$eval('.error-screen h2', el => el.textContent.trim());
  record('2.1.2', err1.includes('invalide') || err1.toLowerCase().includes('invalid'), `error title: ${err1}`);

  await page.goto(`${BASE}/quiz?code=INVALIDXYZ`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.error-screen');
  const err2 = await page.$eval('.error-screen h2', el => el.textContent.trim());
  record('2.1.3', err2.length > 0, 'invalid code shows error');

  await page.goto(`${BASE}/quiz?code=${CLAIRE}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.getElementById('userBadge')?.style.display === 'inline-block', {
    timeout: 8000
  });
  const badge = await page.$eval('#userBadge', el => el.textContent.trim());
  record('2.1.1', badge.includes('Claire'), `badge: ${badge}`);
  const welcome = await page.$eval('.welcome', el => el.textContent);
  record('2.1.1b', welcome.includes('Claire'), `welcome: ${welcome}`);

  const startBtn = await page.$eval('.start-btn', el => el.textContent.trim());
  record('2.2.1', startBtn.includes('Commencer') || startBtn.includes('formation'), `start: ${startBtn}`);

  await page.click('.start-btn');
  await page.waitForSelector('.module-tag', { timeout: 5000 });
  const tag = await page.$eval('.module-tag', el => el.textContent);
  record('2.3.0b', tag.toLowerCase().includes('module'), `tag: ${tag}`);

  await page.click('#q-0-0 .opt-btn:nth-child(2)');
  await page.waitForSelector('#q-0-0 .feedback.correct', { timeout: 3000 });
  record('2.3.1c', true, 'M1 Q1 correct');

  await page.click('#q-0-1 .opt-btn:nth-child(2)');
  await page.waitForSelector('#q-0-1 .feedback.correct', { timeout: 3000 });
  record('2.3.1f', true, 'M1 Q2 correct');

  const nextDisabled = await page.$eval('#nextBtn', el => el.disabled);
  record('2.3.1h', !nextDisabled, 'Next enabled');

  const width = await page.$eval('#progressFill', el => parseFloat(el.style.width));
  record(
    'PROG-DOC',
    Math.abs(width - 13.333333333333334) < 0.15,
    `progress width ${width}% (expected ~13.33% = 2/15 questions, not 1/6 modules)`
  );

  await page.goto(`${BASE}/admin/dashboard.html`, { waitUntil: 'networkidle2' });
  const dashErr = await page.$eval('#content', el => el.innerText);
  record('3.1.2', /non autorisé/i.test(dashErr) && /token/i.test(dashErr), `no token screen`);

  await page.goto(`${BASE}/admin/dashboard.html?token=changeme`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 8000 });
  const rows = await page.$$eval('tbody tr', trs => trs.length);
  record('3.1.1', rows >= 5, `table rows ${rows}`);

  await page.goto(`${BASE}/admin/campaigns.html?token=changeme`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 5000 });
  const h1 = await page.$eval('h1', el => el.textContent);
  record('4.1.1', /campagne/i.test(h1), `h1: ${h1}`);

  await browser.close();

  console.log(JSON.stringify({ pass: results.pass.length, fail: results.fail.length, results }, null, 2));
  process.exit(results.fail.length ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
