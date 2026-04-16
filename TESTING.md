# TESTING.md — Shadow AI Training Quiz

**Date:** April 16, 2026  
**Tool:** Puppeteer (headless Chromium) — automated end-to-end testing  
**Result:** 70 / 70 tests passed (100%)

---

## Test Categories

### 1. Page Load & Initialization

| # | Test | Result |
|---|------|--------|
| 1 | Page loads with correct title ("Shadow AI — Formation Stingray") | PASS |
| 2 | FR is default language | PASS |
| 3 | Intro title displays in FR ("Formation Shadow AI") | PASS |

### 2. Language Toggle (FR/EN)

| # | Test | Result |
|---|------|--------|
| 4 | EN toggle activates EN button | PASS |
| 5 | Intro title displays in EN ("Shadow AI Training") | PASS |
| 6 | Language switch works mid-quiz (Module 1 title changes to English) | PASS |

### 3. Quiz Start

| # | Test | Result |
|---|------|--------|
| 7 | Start button loads Module 1 | PASS |
| 8 | Progress bar visible on Module 1 | PASS |
| 9 | Previous button disabled on Module 1 | PASS |
| 10 | Next button disabled before answering questions | PASS |

### 4. Quiz Structure

| # | Test | Result |
|---|------|--------|
| 11 | Quiz has 6 modules | PASS |
| 12 | Quiz has 15 total questions | PASS |

### 5. Wrong Answer Feedback (Module 1 Q1)

| # | Test | Result |
|---|------|--------|
| 13 | Wrong answer shows feedback | PASS |
| 14 | Wrong answer feedback has "wrong" styling (red) | PASS |
| 15 | Wrong answer button highlighted red | PASS |
| 16 | Correct answer revealed (green highlight) after wrong selection | PASS |

### 6. Module-by-Module — Content & Questions (Correct Answers)

#### Module 1: Qu'est-ce que le Shadow AI ?

| # | Test | Result |
|---|------|--------|
| 17 | Module 1 title correct | PASS |
| 18 | Module 1 content displayed | PASS |
| 19 | Module 1 has 2 questions | PASS |
| 20 | Module 1 Q1: correct answer → green feedback | PASS |
| 21 | Module 1 Q2: correct answer → green feedback | PASS |
| 22 | Next button enabled after answering all | PASS |

#### Module 2: Les risques réels

| # | Test | Result |
|---|------|--------|
| 23 | Module 2 title correct | PASS |
| 24 | Module 2 content displayed | PASS |
| 25 | Module 2 has 2 questions | PASS |
| 26 | Module 2 Q1: correct answer → green feedback | PASS |
| 27 | Module 2 Q2: correct answer → green feedback | PASS |
| 28 | Next button enabled after answering all | PASS |

#### Module 3: Les outils approuvés

| # | Test | Result |
|---|------|--------|
| 29 | Module 3 title correct | PASS |
| 30 | Module 3 content displayed | PASS |
| 31 | Module 3 has 2 questions | PASS |
| 32 | Module 3 Q1: correct answer → green feedback | PASS |
| 33 | Module 3 Q2: correct answer → green feedback | PASS |
| 34 | Next button enabled after answering all | PASS |

#### Module 4: Le bon processus

| # | Test | Result |
|---|------|--------|
| 35 | Module 4 title correct | PASS |
| 36 | Module 4 content displayed | PASS |
| 37 | Module 4 has 2 questions | PASS |
| 38 | Module 4 Q1: correct answer → green feedback | PASS |
| 39 | Module 4 Q2: correct answer → green feedback | PASS |
| 40 | Next button enabled after answering all | PASS |

#### Module 5: Scénarios pratiques

| # | Test | Result |
|---|------|--------|
| 41 | Module 5 title correct | PASS |
| 42 | Module 5 content displayed | PASS |
| 43 | Module 5 has 2 questions | PASS |
| 44 | Module 5 Q1: correct answer → green feedback | PASS |
| 45 | Module 5 Q2: correct answer → green feedback | PASS |
| 46 | Next button enabled after answering all | PASS |

#### Module 6: Quiz final — Vrai ou Faux

| # | Test | Result |
|---|------|--------|
| 47 | Module 6 title correct | PASS |
| 48 | Module 6 content displayed | PASS |
| 49 | Module 6 has 5 questions (True/False) | PASS |
| 50 | Module 6 Q1: correct answer → green feedback | PASS |
| 51 | Module 6 Q2: correct answer → green feedback | PASS |
| 52 | Module 6 Q3: correct answer → green feedback | PASS |
| 53 | Module 6 Q4: correct answer → green feedback | PASS |
| 54 | Module 6 Q5: correct answer → green feedback | PASS |
| 55 | Next button enabled after answering all | PASS |

### 7. Results Screen

| # | Test | Result |
|---|------|--------|
| 56 | Perfect score displayed ("15 / 15") | PASS |
| 57 | Recap section present | PASS |
| 58 | Recap has all 15 questions listed | PASS |
| 59 | Key takeaways section present | PASS |
| 60 | Restart button present | PASS |
| 61 | Excellent message for 100% score | PASS |

### 8. Navigation

| # | Test | Result |
|---|------|--------|
| 62 | Restart returns to intro screen | PASS |
| 63 | Navigated forward to Module 2 | PASS |
| 64 | Previous button navigates back to Module 1 | PASS |
| 65 | Answers preserved after navigating back | PASS |

### 9. Mobile Viewport (375px)

| # | Test | Result |
|---|------|--------|
| 66 | App fits within 375px viewport | PASS |
| 67 | Header visible at 375px | PASS |
| 68 | Question blocks fit within 375px | PASS |
| 69 | No horizontal scroll at 375px | PASS |

### 10. Score Tracking

| # | Test | Result |
|---|------|--------|
| 70 | Score correctly shows 1/15 after 1 correct + 1 wrong answer | PASS |

---

## Bugs Found

None — all 70 tests passed on the first full run.

---

## Summary

| Category | Tests | Passed |
|----------|-------|--------|
| Page Load & Init | 3 | 3 |
| Language Toggle | 3 | 3 |
| Quiz Start | 4 | 4 |
| Quiz Structure | 2 | 2 |
| Wrong Answer Feedback | 4 | 4 |
| Module Content & Questions | 36 | 36 |
| Results Screen | 6 | 6 |
| Navigation | 4 | 4 |
| Mobile Viewport (375px) | 4 | 4 |
| Score Tracking | 1 | 1 |
| **TOTAL** | **70** | **70** |
