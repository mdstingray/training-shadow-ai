const { parse } = require('csv-parse/sync');

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_');
}

/**
 * Map CSV row to { name, email, supervisor_name, supervisor_email }.
 * Accepts FR/EN column headers.
 */
function classifyHeader(cell) {
  const n = norm(cell);
  if (!n) return null;
  const hasSuper = /superviseur|supervisor|super_/.test(n);
  const hasEmail = /email|courriel|mail|e-mail/.test(n);
  if (hasEmail && hasSuper) return 'supervisor_email';
  if (hasEmail && !hasSuper) return 'email';
  if (hasSuper && !hasEmail) return 'supervisor_name';
  if (
    /^(nom|name|employe|employee|prenom|participant)/.test(n) ||
    (/(nom|name|employ)/.test(n) && !hasSuper)
  ) {
    return 'name';
  }
  return null;
}

function parseParticipantsCsv(buffer) {
  const text = buffer.toString('utf8');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true
  });
  if (!records.length) {
    return { rows: [], errors: ['CSV vide ou sans en-têtes valides.'] };
  }

  const rawHeaders = Object.keys(records[0]);
  const headerMap = {};
  for (const h of rawHeaders) {
    const field = classifyHeader(h);
    if (field && !headerMap[field]) headerMap[field] = h;
  }

  const errors = [];
  if (!headerMap.name) errors.push('Colonne « nom employé » introuvable (attendu: nom, name, employé…).');
  if (!headerMap.email) errors.push('Colonne « email » introuvable (attendu: email, courriel…).');

  const rows = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const name = headerMap.name ? String(r[headerMap.name] || '').trim() : '';
    const email = headerMap.email ? String(r[headerMap.email] || '').trim() : '';
    const supervisor_name = headerMap.supervisor_name
      ? String(r[headerMap.supervisor_name] || '').trim()
      : '';
    const supervisor_email = headerMap.supervisor_email
      ? String(r[headerMap.supervisor_email] || '').trim()
      : '';
    if (!name && !email) continue;
    if (!email) {
      errors.push(`Ligne ${i + 2}: email manquant pour « ${name || '?'} ».`);
      continue;
    }
    if (!name) {
      errors.push(`Ligne ${i + 2}: nom manquant pour ${email}.`);
      continue;
    }
    rows.push({ name, email, supervisor_name, supervisor_email });
  }

  return { rows, errors, headerMap };
}

module.exports = { parseParticipantsCsv, norm };
