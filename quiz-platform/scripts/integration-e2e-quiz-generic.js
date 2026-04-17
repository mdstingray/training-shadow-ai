#!/usr/bin/env node
/**
 * Backwards-compatible entry point — forwards to the UX user-journey test.
 * Prefer: node scripts/ux-e2e-quiz-user-journey.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, 'ux-e2e-quiz-user-journey.js')], {
  stdio: 'inherit',
  env: process.env
});
process.exit(r.status === null ? 1 : r.status);
