# TESTING.md — Shadow AI Quiz Platform

**Date:** April 16, 2026  
**Tools:** Node.js HTTP client (API tests) + Puppeteer (E2E browser tests)  
**Result:** 107 / 107 tests passed (100%)

---

## Setup

```bash
cd quiz-platform
npm install
node scripts/seed-quiz.js   # Creates quiz + 5 sample users
node backend/server.js       # Starts on port 3000
```

---

## Test Suite 1: API Endpoint Tests (54 tests)

### GET /

| # | Test | Result |
|---|------|--------|
| 1 | Returns 200 | PASS |
| 2 | Returns `{ status: "ok" }` | PASS |

### POST /api/start

| # | Test | Result |
|---|------|--------|
| 3 | Valid code returns 200 | PASS |
| 4 | Returns correct user name | PASS |
| 5 | Returns quiz data with id=1 | PASS |
| 6 | Returns 6 modules | PASS |
| 7 | Returns attempts array | PASS |
| 8 | Invalid code returns 404 | PASS |
| 9 | Returns `invalid_code` error message | PASS |
| 10 | Missing code returns 400 | PASS |

### POST /api/submit

| # | Test | Result |
|---|------|--------|
| 11 | Valid submit returns 200 | PASS |
| 12 | Returns `success: true` | PASS |
| 13 | Second module submit returns 200 | PASS |
| 14 | Invalid code returns 404 | PASS |
| 15 | Missing fields returns 400 | PASS |

### GET /api/progress/:code

| # | Test | Result |
|---|------|--------|
| 16 | Returns 200 for valid code | PASS |
| 17 | Returns correct user name | PASS |
| 18 | Status is `in_progress` after 2/6 modules | PASS |
| 19 | Shows 2 completed modules | PASS |
| 20 | Shows 6 total modules | PASS |
| 21 | Has 2 attempt records | PASS |
| 22 | Invalid code returns 404 | PASS |

### Full Completion Flow

| # | Test | Result |
|---|------|--------|
| 23-26 | Remaining 4 modules submitted (200 each) | PASS |
| 27 | Status changes to `completed` after 6/6 modules | PASS |
| 28 | Shows 6/6 completed | PASS |

### GET /admin/api/users

| # | Test | Result |
|---|------|--------|
| 29 | Returns 200 with valid token | PASS |
| 30 | Returns users array | PASS |
| 31 | Has 5 users | PASS |
| 32 | Returns quizzes array | PASS |
| 33 | First user shows as `completed` | PASS |
| 34 | First user has avg_score > 0 (78.33%) | PASS |
| 35 | 4 users show as `not_started` | PASS |
| 36 | Invalid token returns 401 | PASS |
| 37 | Missing token returns 401 | PASS |

### GET /admin/api/export.csv

| # | Test | Result |
|---|------|--------|
| 38 | Returns 200 | PASS |
| 39 | Content-Type is text/csv | PASS |
| 40 | CSV contains user data | PASS |
| 41 | CSV has proper headers | PASS |
| 42 | CSV has header + 5 data rows | PASS |
| 43 | Invalid token returns 401 | PASS |

### PUT /admin/api/quiz/:id/deadline

| # | Test | Result |
|---|------|--------|
| 44 | Returns 200 | PASS |
| 45 | Returns `success: true` | PASS |
| 46 | Deadline persisted in DB (2026-04-30) | PASS |
| 47 | Invalid token returns 401 | PASS |

### Static File Serving

| # | Test | Result |
|---|------|--------|
| 48 | GET /quiz?code=... serves quiz.html (200) | PASS |
| 49 | Quiz HTML contains Shadow AI content | PASS |
| 50 | GET /admin/dashboard.html serves (200) | PASS |
| 51 | Admin HTML contains Admin content | PASS |

### Second User (Not Started)

| # | Test | Result |
|---|------|--------|
| 52 | Progress returns 200 | PASS |
| 53 | Status is `not_started` | PASS |
| 54 | 0 completed modules | PASS |

---

## Test Suite 2: E2E Browser Tests — Puppeteer (53 tests)

### Invalid/Missing Code

| # | Test | Result |
|---|------|--------|
| 1 | Invalid code shows error screen ("Lien invalide") | PASS |
| 2 | No code parameter shows error screen | PASS |

### Valid Code — Intro Screen

| # | Test | Result |
|---|------|--------|
| 3 | Welcome message shows user name | PASS |
| 4 | User badge visible in header | PASS |
| 5 | FR is default language | PASS |
| 6 | Start button loads Module 1 | PASS |
| 7 | EN toggle works mid-quiz | PASS |

### Module-by-Module Playthrough (All Correct)

#### Module 1: Qu'est-ce que le Shadow AI ?

| # | Test | Result |
|---|------|--------|
| 8 | Title displayed | PASS |
| 9 | Has 2 questions | PASS |
| 10 | Q1 correct feedback | PASS |
| 11 | Q2 correct feedback | PASS |
| 12 | Next button enabled | PASS |

#### Module 2: Les risques réels

| # | Test | Result |
|---|------|--------|
| 13 | Title displayed | PASS |
| 14 | Has 2 questions | PASS |
| 15 | Q1 correct feedback | PASS |
| 16 | Q2 correct feedback | PASS |
| 17 | Next button enabled | PASS |

#### Module 3: Les outils approuvés

| # | Test | Result |
|---|------|--------|
| 18 | Title displayed | PASS |
| 19 | Has 2 questions | PASS |
| 20 | Q1 correct feedback | PASS |
| 21 | Q2 correct feedback | PASS |
| 22 | Next button enabled | PASS |

#### Module 4: Le bon processus

| # | Test | Result |
|---|------|--------|
| 23 | Title displayed | PASS |
| 24 | Has 2 questions | PASS |
| 25 | Q1 correct feedback | PASS |
| 26 | Q2 correct feedback | PASS |
| 27 | Next button enabled | PASS |

#### Module 5: Scénarios pratiques

| # | Test | Result |
|---|------|--------|
| 28 | Title displayed | PASS |
| 29 | Has 2 questions | PASS |
| 30 | Q1 correct feedback | PASS |
| 31 | Q2 correct feedback | PASS |
| 32 | Next button enabled | PASS |

#### Module 6: Quiz final — Vrai ou Faux

| # | Test | Result |
|---|------|--------|
| 33 | Title displayed | PASS |
| 34 | Has 5 questions | PASS |
| 35-39 | Q1-Q5 correct feedback | PASS |
| 40 | Next button enabled | PASS |

### Results Screen

| # | Test | Result |
|---|------|--------|
| 41 | Perfect score "15 / 15" displayed | PASS |
| 42 | Recap has all 15 question items | PASS |
| 43 | Key takeaways section present | PASS |
| 44 | Server confirms user status = `completed` | PASS |
| 45 | Server confirms 6/6 modules completed | PASS |

### Mobile Viewport (375px)

| # | Test | Result |
|---|------|--------|
| 46 | App fits within 375px | PASS |
| 47 | No horizontal overflow | PASS |

### Admin Dashboard (Browser)

| # | Test | Result |
|---|------|--------|
| 48 | Dashboard has 4 stat cards | PASS |
| 49 | Dashboard shows 5 user rows | PASS |
| 50 | Dashboard has 4 filter buttons | PASS |
| 51 | CSV export link with token present | PASS |
| 52 | Deadline input present | PASS |
| 53 | Dashboard without token shows error | PASS |

---

## Summary

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| API Endpoints | 54 | 54 | 0 |
| E2E Browser (Puppeteer) | 53 | 53 | 0 |
| **TOTAL** | **107** | **107** | **0** |

### Bugs Found

None — all 107 tests passed.

### Test Coverage

- All 5 API endpoints tested (success + error cases)
- Authentication (valid/invalid/missing codes + admin token)
- Full quiz flow: 6 modules, 15 questions, correct answers
- Score submission to server after each module
- Progress tracking (not_started → in_progress → completed)
- Admin dashboard: stats, table, filters, CSV export, deadline
- Mobile responsive (375px viewport)
- FR/EN language toggle
- Error handling (invalid links)
