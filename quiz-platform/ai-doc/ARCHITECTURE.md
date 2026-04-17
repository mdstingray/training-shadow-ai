# Architecture — Shadow AI Quiz Platform

Application **monolithique** : un serveur **Node.js + Express** sert l'API JSON, les pages statiques du quiz et de l'admin, et persiste les données dans **SQLite** (`better-sqlite3`).

---

## Vue d'ensemble

```
Navigateur
    │
    ├─ GET /quiz?code=…          → frontend/quiz.html (SPA légère)
    ├─ GET /admin/*.html         → admin (dashboard, campagnes)
    ├─ GET /frontend/*           → assets (CSS, images, PNG)
    │
    └─ POST/GET /api/*           → auth + quiz (participants)
        GET     /admin/api/*     → admin (token requis)
```

- **Authentification participant** : pas de session login. Le paramètre `code` dans l'URL identifie une ligne `campaign_users.unique_code` (source de vérité des liens personnels).
- **Authentification admin** : `?token=…` ou en-tête `x-admin-token`, comparé à `ADMIN_TOKEN`.

---

## Couches

| Couche | Rôle |
|--------|------|
| **Frontend quiz** | `frontend/quiz.html` + `frontend/assets/*` — contenu pédagogique et questions dans le JS (`QUIZ_DATA`). Chaque module inclut une illustration PNG (`shadow-ai-module{1..6}*.png`). Feedback détaillé par option (`explain_opts`). Persistance locale : `sessionStorage` (parcours, langue). |
| **Admin** | `admin/dashboard.html`, `admin/campaigns.html` — tableaux et formulaires ; appellent `/admin/api/*`. |
| **API** | `backend/routes/auth.js` (`POST /api/start`), `quiz.js` (`POST /api/submit`, `GET /api/progress/:code`), `admin.js` (quizzes, campagnes, users, export CSV, import CSV). |
| **Données** | `backend/db/init.js` — schéma SQLite, migrations légères (`migrate()`), connexion singleton. |
| **Librairies** | `codes.js` (génération de codes), `csvParticipants.js` / import CSV, `resolveCode.js` (résolution `code` → utilisateur + campagne + quiz). |

---

## Modèle de données (résumé)

| Table | Rôle |
|-------|------|
| `quizzes` | Questionnaire (nom, échéance optionnelle). |
| `modules` | Modules ordonnés (`quiz_id`, `position`) — les **IDs** servent à `POST /api/submit` (`module_id`). |
| `users` | Identité : `email` unique, `name`. **Pas** de code dans cette table. |
| `campaigns` | Déploiement : lien entre un quiz et une campagne (nom, `deadline`). |
| `campaign_users` | **Liens personnels** : `unique_code` + `campaign_id` + `user_id` (+ superviseur optionnel). Toute résolution `?code=` passe par ici. |
| `attempts` | Scores par module (`user_id`, `quiz_id`, `module_id`, `score`, `campaign_id`, `attempt_number`, …). |
| `quiz_users` | Ancien modèle d'inscription ; migré vers `campaign_users` si nécessaire au démarrage. |

**Cohérence importante** : l'ordre et le nombre de modules côté client (`quiz.html`) doivent correspondre aux `modules` en base (même quiz, positions 1…n). Le script `scripts/seed-quiz.js` aligne seed et contenu.

---

## Fonctionnalités pédagogiques (frontend)

### Illustrations par module

Chaque module affiche une image (`<figure class="module-figure">`) insérée dans le bloc `content` de `QUIZ_DATA` (FR et EN). Les assets sont dans `frontend/assets/` :

| Module | Fichier |
|--------|---------|
| 1 — Qu'est-ce que le Shadow AI ? | `shadow-ai-module1.png` |
| 2 — Les risques réels | `shadow-ai-module2-risks.png` |
| 3 — Les outils approuvés | `shadow-ai-module3-tools.png` |
| 4 — Le bon processus | `shadow-ai-module4-process.png` |
| 5 — Scénarios pratiques | `shadow-ai-module5-scenarios.png` |
| 6 — Quiz final Vrai/Faux | `shadow-ai-module6-quiz.png` |

Style visuel unifié : fond sombre, icônes vectorielles, palette bleu/rouge, pas de visages.

### Feedback détaillé par option (`explain_opts`)

Chaque question peut contenir un tableau `explain_opts` (même longueur que `opts`). Après réponse, la fonction `buildRationaleHtml()` affiche un panneau « Pourquoi chaque réponse ? » / « Why each answer? » avec :
- La bonne réponse marquée `✓` (vert)
- Le mauvais choix de l'utilisateur marqué `→` (rouge)
- Une explication courte pour **chaque** option

### Contenu entre questions (`betweenQuestions`)

Un module peut déclarer `betweenQuestions: ["<html>", …]` (même longueur que `questions` − 1). Le HTML est inséré **entre** deux questions (utilisé dans le module 1 pour les « signaux d'alerte »).

### Scénarios

Le module 1 contient un bloc `<div class="scenario-card">` (scénario de Lena) dans son `content`. Ce pattern peut être réutilisé dans d'autres modules.

### Design (CSS)

- Police : **Outfit** (Google Fonts), poids 400–800
- Fond : dégradés radiaux discrets (bleu/cyan) sur fond fixe `#0c0c0e`
- Cartes : `backdrop-filter: blur`, bordures translucides, ombres progressives
- Animations : `moduleIn`, `fadeIn`, courbe `cubic-bezier(0.22,1,0.36,1)`
- Respect `prefers-reduced-motion` : animations désactivées
- Focus clavier visible (`:focus-visible`) — conforme WCAG

---

## Flux principaux

1. **Démarrage quiz** : `POST /api/start` avec `{ "code": "…" }` → valide le code, renvoie utilisateur, quiz, campagne, modules, tentatives existantes.
2. **Fin de module** : `POST /api/submit` avec `code`, `module_id`, `score`, `time_spent_seconds` → enregistrement dans `attempts` (numéro de tentative auto-incrémenté par module).
3. **Progression** : `GET /api/progress/:code` → statut global, pourcentage, détail par module (meilleur score, tentatives).
4. **Admin** : liste des utilisateurs par campagne, export CSV, création de campagne, import participants (CSV), mise à jour d'échéance.

---

## Fichiers clés

| Chemin | Description |
|--------|-------------|
| `backend/server.js` | Point d'entrée Express, statiques, montage des routes. |
| `backend/db/init.js` | SQLite + schéma + migrations. |
| `backend/routes/auth.js` | `POST /api/start`. |
| `backend/routes/quiz.js` | `POST /api/submit`, `GET /api/progress/:code`. |
| `backend/routes/admin.js` | Toutes les routes `/admin/api/*`. |
| `frontend/quiz.html` | UI participant (contenu, questions, `explain_opts`, illustrations). |
| `frontend/assets/*.png` | 6 illustrations de modules (fond sombre, style vectoriel unifié). |
| `admin/dashboard.html` | Tableau de bord et stats. |
| `admin/campaigns.html` | Création de campagne et import CSV. |
| `scripts/seed-quiz.js` | Données de démo + campagne + codes. |

---

## Dépendances runtime (npm)

Express, CORS, `dotenv`, `better-sqlite3`, `multer` (upload CSV), `csv-parse`, `uuid` (codes). **Puppeteer** est une dépendance pour des tests automatisés / outillage, pas requis au démarrage serveur standard.

---

## Points d'attention exploitation

- **Un seul processus** : SQLite convient à une charge modérée ; pour plusieurs instances, il faudrait une autre base ou un fichier DB dédié par instance.
- **Sauvegarde** : copier le fichier `DB_PATH` (souvent `backend/db/quiz.db`) + journal WAL si présent.
- **Secrets** : définir `ADMIN_TOKEN` fort en production ; ne pas commiter `.env`.
