# TESTING.md — Shadow AI Quiz Platform

**Date:** April 16, 2026 (rév. 5 — refonte contenu quiz + suppression de la slide « Vue d'ensemble », contenu du module intégré en intro de la question 1)
**Tools:** Node.js HTTP client (API) + Puppeteer (E2E browser tests)
**Result:** 43 / 68 PASS (run 1) — sections 5–6 en attente d'exécution après ajout campagnes

> **Note rév. 5 — Structure des pages d'un module.** Chaque module n'a plus de slide `content` séparée. Le contenu pédagogique (scénario, illustration, règles) est affiché **en haut de la première question** via `question-intro`. La séquence par module est donc : `question 1 (avec intro)` → `interstitial` (si défini, ex. Module 1) → `question 2` → … (pas de slide d'ouverture dédiée).
>
> **Note rév. 5 — Titres de modules.** Les titres ont été retravaillés côté frontend (`QUIZ_DATA`) et côté seed (`scripts/seed-quiz.js`). Le script `npm run seed` **met à jour en place** les titres existants en BDD (par `position`) sans toucher aux utilisateurs, codes ou tentatives. Les tests qui matchaient sur un titre précis (par ex. « Qu'est-ce que le Shadow AI ? ») doivent être mis à jour ou remplacés par une assertion sur la **position** du module.

---

## 0. Schéma données (référence)

| Table | Rôle |
|-------|------|
| `quizzes` | Quiz (nom, échéance). |
| `modules` | Modules du quiz (`quiz_id`, `position`). Les IDs servent à `POST /api/submit` (`module_id`). |
| `users` | Personnes (`email` unique, `name`). **Pas** de code personnel ici. |
| `campaigns` | Déploiement (`quiz_id`, `deadline`, nom). |
| `campaign_users` | **Source de vérité des liens** : `unique_code` + `campaign_id` + `user_id` (+ superviseur optionnel). `GET/POST` avec `?code=` résolvent via cette table. |
| `attempts` | Résultats (`user_id`, `quiz_id`, `module_id`, `score`, `campaign_id`, …). |
| `quiz_users` | Ancien modèle ; migré vers `campaign_users` si des lignes existaient sans campagne. |

**Cohérence front :** `frontend/quiz.html` charge les titres depuis le client (`QUIZ_DATA`), mais **`module_id` côté serveur** doit correspondre à l’ordre des modules en base (même ordre que les positions 1…n). Le seed crée 6 modules dans le même ordre que le JS.

**Codes de test :** utiliser les codes imprimés par `npm run seed` ou lire `campaign_users.unique_code` en base — les exemples ci-dessous sont indicatifs ; **ne pas** supposer un code fixe entre environnements.

**Si `POST /api/start` renvoie `invalid_code` alors qu’un code existe en base :** redémarrer le serveur Node (connexion SQLite / état obsolète possible).

---

## 1. Setup

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 1.1 | npm install completes without errors | `cd quiz-platform && npm install` | node_modules/ created, no errors | node_modules/ exists, 0 vulnerabilities | **PASS** |
| 1.2 | seed-quiz.js runs successfully, prints 5 sample links | `node scripts/seed-quiz.js` | 5 users created, 5 links printed to console | 5 users found, links printed with unique codes | **PASS** |
| 1.3 | server.js starts on port 3000 without errors | `node backend/server.js` then `curl localhost:3000/` | GET / returns 200 with `{"status":"ok"}` | status=200, status=ok | **PASS** |
| 1.4 | DB file quiz.db is created automatically | `ls backend/db/quiz.db` | File exists | quiz.db exists | **PASS** |

---

## 2. API Tests

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 2.1 | POST /api/start with valid code returns quiz + campaign + user (200) | `curl -X POST localhost:3000/api/start -H 'Content-Type: application/json' -d '{"code":"<code depuis campaign_users>"}'` | Status 200, `user`, `quiz`, `campaign`, `modules` (6), `attempts` | status=200, user=Alice Martin, modules=6, campaign present | **PASS** |
| 2.2 | POST /api/start with invalid code returns 401 with clear error message | `curl -X POST localhost:3000/api/start -d '{"code":"INVALIDXYZ"}'` | Status 401, error=invalid_code, human-readable message | status=401, error=invalid_code, msg="Lien invalide — contacte ton admin..." | **PASS** |
| 2.3 | POST /api/submit with valid data saves to DB and returns confirmation | `curl -X POST localhost:3000/api/submit -d '{"code":"...","module_id":1,"score":100,"time_spent_seconds":30}'` | Status 200, success=true, attempt_number=1 | status=200, success=true, attempt=1 | **PASS** |
| 2.4 | POST /api/submit second attempt increments attempt_number correctly | `curl -X POST /api/submit` (same module_id again) | attempt_number=2 | attempt_number=2 | **PASS** |
| 2.5 | GET /api/progress/:code returns completion %, campaign, per-module status | `curl localhost:3000/api/progress/<code>` | status=completed, completionPercent=100, 6 perModule, `campaign` object | status=completed, pct=100%, modules=6, campaign present | **PASS** |
| 2.6 | Progress tracks best score per module and attempt count | Check perModule[0].best_score and attempts | best_score=100 (first attempt beat second's 50), attempts=2 | best_score=100, attempts=2 | **PASS** |
| 2.7 | GET /admin/users returns campaigns[] + users[] with supervisor fields | `curl localhost:3000/admin/api/users?token=changeme` | Status 200, `campaigns[]`, `users[]` with `campaign_name`, `supervisor_name`, `supervisor_email` | status=200, users=5, campaigns=1 | **PASS** |
| 2.8 | Alice shows as completed in admin view | Check Alice's status in admin response | status=completed | status=completed | **PASS** |
| 2.9 | GET /admin/users without token returns 403 | `curl localhost:3000/admin/api/users` | Status 403 | status=403 | **PASS** |
| 2.10 | GET /admin/users with wrong token returns 403 | `curl localhost:3000/admin/api/users?token=wrong` | Status 403 | status=403 | **PASS** |
| 2.11 | GET /admin/export.csv returns CSV with Campaign + Supervisor columns | `curl localhost:3000/admin/api/export.csv?token=changeme` | Status 200, text/csv, BOM UTF-8, headers: Campaign, Quiz, Name, Email, Supervisor, Supervisor Email, Status, … | status=200, correct extended headers | **PASS** |

---

## 3. Quiz Flow (Full User Journey via Puppeteer)

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 3.1 | Open quiz.html?code=VALID_CODE — quiz loads, user name shown | Open `/quiz?code=<valid>` in browser | Welcome message with participant name | e.g. "Bienvenue, Bob Tremblay" | **PASS** |
| 3.2 | Open quiz.html?code=INVALID — friendly error message shown | Open `/quiz?code=INVALIDXXX` | Error screen with "Lien invalide" | "Lien invalide — contacte ton admin." | **PASS** |
| 3.3 | Complete Module 1: answer all questions, submit, see score + feedback | Click Start, answer 2 questions correctly | 2 green feedback messages shown | 2 feedback messages shown | **PASS** |
| 3.4 | Module 1 progress bar + Next button | Answer all, check Next enabled | Next enabled, progress at 13.33% | nextEnabled=true, width=13.3333% | **PASS** |
| 3.5 | Module 2 progress bar + Next button | Navigate to M2, answer all | Next enabled, progress at 26.67% | nextEnabled=true, width=26.6667% | **PASS** |
| 3.6 | Module 3 progress bar + Next button | Navigate to M3, answer all | Next enabled, progress at 40% | nextEnabled=true, width=40% | **PASS** |
| 3.7 | Module 4 progress bar + Next button | Navigate to M4, answer all | Next enabled, progress at 53.33% | nextEnabled=true, width=53.3333% | **PASS** |
| 3.8 | Module 5 progress bar + Next button | Navigate to M5, answer all | Next enabled, progress at 66.67% | nextEnabled=true, width=66.6667% | **PASS** |
| 3.9 | Complete all 6 modules in sequence | Navigate through M1-M6 | All 6 completed | All 6 modules completed | **PASS** |
| 3.10 | Progress bar advances correctly (reaches 100%) | Check progress bar after last module | width=100% | width=100% | **PASS** |
| 3.11 | Final screen shows overall score after last module | Check results screen | Score "15 / 15" displayed | "15 / 15" | **PASS** |
| 3.12 | After completing all modules: GET /api/progress shows 100% complete | `curl /api/progress/<code>` | status=completed, completionPercent=100 | status=completed, pct=100 | **PASS** |

### 3a. Participant UX journey (browser test, not API)

End-to-end **A→Z**: starts at intro, walks every module step (**question 1 avec intro de module intégrée → interstitial éventuel → question suivante …**), submits **correct** answers so the run matches a perfect score, waits for feedback and rationale, checks that the module illustration is visible on the first question of each module, then asserts the results screen and **`GET /api/progress`** (`completed`, 100%). Puppeteer uses visible clicks for Start and real `goNext()` / `selectAnswer()` in-page for a faithful path. It does **not** replace `curl` API tests (§2) or `integration-e2e-smoke.js`.

```bash
cd quiz-platform
QUIZ_CODE=<code from seed or DB> node scripts/ux-e2e-quiz-user-journey.js
# or: npm run test:ux:quiz
```

Watch the browser: `UX_HEADLESS=0 UX_SLOW_MS=40 QUIZ_CODE=<code> node scripts/ux-e2e-quiz-user-journey.js`  
Screenshots: `UX_SCREENSHOT_DIR=./tmp/ux-shots` (see **`ai-doc/INTEGRATION-TEST-PLAN.md` §8**).

**Product feedback output:** Each run prints a **PRODUCT FEEDBACK** block on **stderr** (bugs vs improvements vs notes, with suggested actions). The same data is in the JSON under `productFeedback.findings` and a ready-to-paste `productFeedback.markdownReport`. Save a file with `UX_REPORT_PATH=./tmp/ux-feedback.md`.

---

## 4. Admin Dashboard

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 4.1 | Dashboard loads with 10-column table (incl. Campagne, Superviseur) | Open `/admin/dashboard.html?token=changeme` | 10 columns, 5 rows | 5 rows, correct columns | **PASS** |
| 4.2 | Status badges show correct state | Check badge text on each row | Terminé / En cours / Pas commencé | Correct badges | **PASS** |
| 4.3 | Filter buttons present (FR labels) | Count filter buttons | 4 buttons (Tous/Terminé/En cours/Pas commencé) with counts | 4 buttons | **PASS** |
| 4.4 | Terminé filter works | Click Terminé filter | Only completed rows shown | Filtered OK | **PASS** |
| 4.5 | Pas commencé filter works | Click Pas commencé filter | Only not_started rows shown | Filtered OK | **PASS** |
| 4.6 | CSV export link includes campaign_id when campaign selected | Select campaign → check href | Contains `&campaign_id=…` | Correct link | **PASS** |
| 4.7 | Campaign selector present and filters data | Select "Stingray Town Hall 2026" | Stats + table refresh for that campaign | Filtered OK | **PASS** |
| 4.8 | Deadline input disabled until campaign selected | No campaign → input disabled; select campaign → enabled | Disabled then enabled | Correct | **PASS** |
| 4.9 | Deadline modification saves and shows "Enregistré." | Select campaign → change date | Message appears 2 s | Deadline saved | **PASS** |
| 4.10 | Link to Campagnes page | Click "Campagnes" | Navigates to `/admin/campaigns.html?token=…` | OK | **PASS** |
| 4.11 | Dashboard without token shows error | Open without `?token=` | "Non autorisé" | Error shown | **PASS** |

---

## 5. Admin Campagnes (`/admin/campaigns.html`)

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 5.1 | Page loads with form + table | Open `/admin/campaigns.html?token=changeme` | 3 cartes : formulaire, format CSV, campagnes existantes | Page OK | — |
| 5.2 | Seed campaign visible in table | Check table | "Stingray Town Hall 2026", 5 participants | Correct | — |
| 5.3 | Create campaign — success | Fill name + quiz + optional deadline → submit | Message "Campagne créée.", new row in table | — | — |
| 5.4 | Create campaign — missing name blocked by HTML validation | Leave name empty → submit | Browser validation blocks | — | — |
| 5.5 | Import CSV — no file selected | Click "Importer CSV" without file | Message "Choisissez un fichier .csv" | — | — |
| 5.6 | Import CSV — valid file | Select correct CSV → import | "Import terminé — X inscription(s), Y mise(s) à jour" | — | — |
| 5.7 | Import CSV — duplicate emails in same file | CSV with 2 identical emails | 1 enrollment + warning "Doublon ignoré" | — | — |
| 5.8 | Re-import same CSV updates supervisors | Import once, change supervisor, re-import | enrollments_updated > 0 | — | — |
| 5.9 | Import CSV with FR headers | `nom_employe,courriel,nom_superviseur,courriel_superviseur` | Import OK | — | — |
| 5.10 | Import CSV with EN headers | `employee_name,email,supervisor_name,supervisor_email` | Import OK | — | — |
| 5.11 | Link back to dashboard | Click "← Tableau de bord" | Navigates to `/admin/dashboard.html?token=…` | — | — |
| 5.12 | Page without token shows error | Open without `?token=` | "Non autorisé" | — | — |

---

## 6. Campaign API Tests

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 6.1 | GET /admin/api/quizzes — lists quizzes with module_count | `curl .../admin/api/quizzes?token=changeme` | 200, quizzes[].module_count | — | — |
| 6.2 | GET /admin/api/campaigns — lists campaigns with participant_count | `curl .../admin/api/campaigns?token=changeme` | 200, campaigns[].participant_count | — | — |
| 6.3 | POST /admin/api/campaigns — create campaign | `{"name":"Test","quiz_id":1}` | 200, campaign.id returned | — | — |
| 6.4 | POST /admin/api/campaigns — missing name → 400 | `{"quiz_id":1}` | 400 | — | — |
| 6.5 | POST /admin/api/campaigns — quiz not found → 404 | `{"name":"X","quiz_id":999}` | 404 | — | — |
| 6.6 | PUT /admin/api/campaigns/:id/deadline | `{"deadline":"2026-06-01"}` | 200, deadline updated | — | — |
| 6.7 | PUT /admin/api/campaigns/:id/deadline — campaign not found | ID 999 | 404 | — | — |
| 6.8 | POST /admin/api/campaigns/:id/import — valid CSV | multipart, field `file` | 200, `rows_in_file`, `users_created`, `enrollments_created`, `warnings` | — | — |
| 6.9 | POST /admin/api/campaigns/:id/import — no file → 400 | POST without file | 400, "Missing file" | — | — |
| 6.10 | GET /admin/api/users?campaign_id=1 — filtered by campaign | Add `campaign_id` param | Only users of that campaign | — | — |
| 6.11 | GET /admin/api/export.csv?campaign_id=1 — filtered CSV | Add `campaign_id` param | CSV with only that campaign's data | — | — |
| 6.12 | POST /api/submit — module_not_in_campaign guard | Submit with module_id from a different quiz | 400, `module_not_in_campaign` | — | — |
| 6.13 | All admin routes without token → 403 | Call each route without token | 403 on every route | — | — |

---

## 7. Edge Cases

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 7.1 | Pre-refresh: answer saved | Answer Q1 of Module 1, check feedback | 1 feedback shown | 1 feedback shown | **PASS** |
| 7.2 | Refreshing quiz page mid-module resumes correctly (progress not lost) | Reload page after answering Q1 | Module 1 still visible, Q1 answer preserved | Module 1 visible, 1 feedback preserved | **PASS** |
| 7.3 | Completing a module twice: second attempt recorded | POST /api/submit twice for same module | First attempt_number=1, second attempt_number=2 | First=1, second=2 | **PASS** |
| 7.4 | Best score kept across attempts | GET /api/progress, check best_score | best_score=80 (80 > 50), attempts=2 | best_score=80, attempts=2 | **PASS** |
| 7.5 | Two different users can take the quiz simultaneously | Open two browser tabs with different codes | Each user sees their own name, independent state | Alice sees "Alice", David sees "David" — independent | **PASS** |

---

## Summary

| Section | Tests | Passed | Pending |
|---------|-------|--------|---------|
| 1. Setup | 4 | 4 | 0 |
| 2. API Tests | 11 | 11 | 0 |
| 3. Quiz Flow | 12 | 12 | 0 |
| 4. Admin Dashboard | 11 | 11 | 0 |
| 5. Admin Campagnes | 12 | 0 | 12 |
| 6. Campaign API Tests | 13 | 0 | 13 |
| 7. Edge Cases | 5 | 5 | 0 |
| **TOTAL** | **68** | **43** | **25** |

### Bugs Found & Fixed Before Final Run

1. **Invalid code returned 404 instead of 401** — Fixed in `auth.js` and `quiz.js` to return 401 with clear bilingual error message.
2. **Admin missing token returned 401 instead of 403** — Fixed in `admin.js` to return 403 Forbidden.
3. **Second attempt didn't auto-increment attempt_number** — Fixed in `quiz.js` to query `MAX(attempt_number)` and auto-increment.
4. **Page refresh lost all progress** — Added `sessionStorage` persistence in `quiz.html` — answers, current module, and language saved on every interaction, restored on page load.
5. **Duplicate module submission on revisit** — Added `submittedModules` tracking to avoid re-submitting already-submitted modules to the server.
6. **Progress API missing per-module breakdown** — Added `perModule` array and `completionPercent` field to progress response, plus `avgBestScore` using best score per module.

All bugs were fixed and verified before the final test run. **40/40 PASS.**
