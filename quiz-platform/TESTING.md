# TESTING.md — Shadow AI Quiz Platform

**Date:** April 16, 2026
**Tools:** Node.js HTTP client (API) + Puppeteer (E2E browser tests)
**Result:** 40 / 40 tests PASSED — all sections green

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
| 2.1 | POST /api/start with valid code returns quiz data + user info (200) | `curl -X POST localhost:3000/api/start -H 'Content-Type: application/json' -d '{"code":"C2750942A"}'` | Status 200, user name, quiz data, 6 modules | status=200, user=Alice Martin, modules=6 | **PASS** |
| 2.2 | POST /api/start with invalid code returns 401 with clear error message | `curl -X POST localhost:3000/api/start -d '{"code":"INVALIDXYZ"}'` | Status 401, error=invalid_code, human-readable message | status=401, error=invalid_code, msg="Lien invalide — contacte ton admin..." | **PASS** |
| 2.3 | POST /api/submit with valid data saves to DB and returns confirmation | `curl -X POST localhost:3000/api/submit -d '{"code":"...","module_id":1,"score":100,"time_spent_seconds":30}'` | Status 200, success=true, attempt_number=1 | status=200, success=true, attempt=1 | **PASS** |
| 2.4 | POST /api/submit second attempt increments attempt_number correctly | `curl -X POST /api/submit` (same module_id again) | attempt_number=2 | attempt_number=2 | **PASS** |
| 2.5 | GET /api/progress/:code returns correct completion % and per-module status | `curl localhost:3000/api/progress/C2750942A` | status=completed, completionPercent=100, 6 perModule entries | status=completed, pct=100%, modules=6 | **PASS** |
| 2.6 | Progress tracks best score per module and attempt count | Check perModule[0].best_score and attempts | best_score=100 (first attempt beat second's 50), attempts=2 | best_score=100, attempts=2 | **PASS** |
| 2.7 | GET /admin/users?token=changeme returns all 5 seed users with correct status | `curl localhost:3000/admin/api/users?token=changeme` | Status 200, 5 users returned | status=200, users=5 | **PASS** |
| 2.8 | Alice shows as completed in admin view | Check Alice's status in admin response | status=completed | status=completed | **PASS** |
| 2.9 | GET /admin/users without token returns 403 | `curl localhost:3000/admin/api/users` | Status 403 | status=403 | **PASS** |
| 2.10 | GET /admin/users with wrong token returns 403 | `curl localhost:3000/admin/api/users?token=wrong` | Status 403 | status=403 | **PASS** |
| 2.11 | GET /admin/export.csv?token=changeme returns valid CSV with headers | `curl localhost:3000/admin/api/export.csv?token=changeme` | Status 200, Content-Type=text/csv, header row + 5 data rows | status=200, 6 CSV lines, correct headers | **PASS** |

---

## 3. Quiz Flow (Full User Journey via Puppeteer)

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 3.1 | Open quiz.html?code=VALID_CODE — quiz loads, user name shown | Open `/quiz?code=47DF10BA8` in browser | Welcome message with "Bob Tremblay" | "Bienvenue, Bob Tremblay" | **PASS** |
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
| 3.12 | After completing all modules: GET /api/progress shows 100% complete | `curl /api/progress/47DF10BA8` | status=completed, completionPercent=100 | status=completed, pct=100 | **PASS** |

---

## 4. Admin Dashboard

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 4.1 | Open /admin/dashboard.html?token=changeme — table loads with all users | Open admin dashboard in browser | 5 table rows | 5 rows | **PASS** |
| 4.2 | Status column shows correct state | Check badge text on each row | 2 Completed, 3 Not Started | 2 Completed, 3 Not Started | **PASS** |
| 4.3 | Filter buttons present | Count filter buttons | 4 buttons (All/Completed/In Progress/Not Started) | 4 buttons | **PASS** |
| 4.4 | Completed filter works | Click Completed filter | 2 rows shown | 2 rows | **PASS** |
| 4.5 | Not Started filter works | Click Not Started filter | 3 rows shown | 3 rows | **PASS** |
| 4.6 | CSV export button has correct link | Check CSV link href | Contains export.csv and token | Correct link with token | **PASS** |
| 4.7 | Deadline input field is present | Check for date input | Input exists | Input exists | **PASS** |
| 4.8 | Admin dashboard without token shows error | Open `/admin/dashboard.html` (no token) | Error message displayed | Error shown | **PASS** |

---

## 5. Edge Cases

| # | Test | Steps | Expected | Actual | Result |
|---|------|-------|----------|--------|--------|
| 5.1 | Pre-refresh: answer saved | Answer Q1 of Module 1, check feedback | 1 feedback shown | 1 feedback shown | **PASS** |
| 5.2 | Refreshing quiz page mid-module resumes correctly (progress not lost) | Reload page after answering Q1 | Module 1 still visible, Q1 answer preserved | Module 1 visible, 1 feedback preserved | **PASS** |
| 5.3 | Completing a module twice: second attempt recorded | POST /api/submit twice for same module | First attempt_number=1, second attempt_number=2 | First=1, second=2 | **PASS** |
| 5.4 | Best score kept across attempts | GET /api/progress, check best_score | best_score=80 (80 > 50), attempts=2 | best_score=80, attempts=2 | **PASS** |
| 5.5 | Two different users can take the quiz simultaneously | Open two browser tabs with different codes | Each user sees their own name, independent state | Alice sees "Alice", David sees "David" — independent | **PASS** |

---

## Summary

| Section | Tests | Passed | Failed |
|---------|-------|--------|--------|
| 1. Setup | 4 | 4 | 0 |
| 2. API Tests | 11 | 11 | 0 |
| 3. Quiz Flow | 12 | 12 | 0 |
| 4. Admin Dashboard | 8 | 8 | 0 |
| 5. Edge Cases | 5 | 5 | 0 |
| **TOTAL** | **40** | **40** | **0** |

### Bugs Found & Fixed Before Final Run

1. **Invalid code returned 404 instead of 401** — Fixed in `auth.js` and `quiz.js` to return 401 with clear bilingual error message.
2. **Admin missing token returned 401 instead of 403** — Fixed in `admin.js` to return 403 Forbidden.
3. **Second attempt didn't auto-increment attempt_number** — Fixed in `quiz.js` to query `MAX(attempt_number)` and auto-increment.
4. **Page refresh lost all progress** — Added `sessionStorage` persistence in `quiz.html` — answers, current module, and language saved on every interaction, restored on page load.
5. **Duplicate module submission on revisit** — Added `submittedModules` tracking to avoid re-submitting already-submitted modules to the server.
6. **Progress API missing per-module breakdown** — Added `perModule` array and `completionPercent` field to progress response, plus `avgBestScore` using best score per module.

All bugs were fixed and verified before the final test run. **40/40 PASS.**
