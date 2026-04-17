# Déploiement et tests — Shadow AI Quiz Platform

Guide **concis** pour installer, déployer et valider la plateforme. Détails des cas de test : voir `TESTING.md` (résultats API + parcours) et `ai-doc/INTEGRATION-TEST-PLAN.md` (plan E2E large).

---

## Prérequis

- **Node.js** LTS (v18+ recommandé)
- **npm**
- Accès en écriture au répertoire de la base SQLite (création automatique du fichier)

---

## Installation locale (développement)

```bash
cd quiz-platform
cp .env.example .env
# Éditer .env : PORT, ADMIN_TOKEN, DB_PATH
npm install
npm run seed    # crée le quiz, une campagne, des utilisateurs ; affiche des liens /quiz?code=…
npm start       # ou : node backend/server.js
```

Vérification rapide :

```bash
curl -s http://localhost:3000/
# Attendu : {"status":"ok",...}
```

Ouvrir un lien imprimé par le seed ou :  
`http://localhost:3000/quiz?code=<CODE>`  
Admin : `http://localhost:3000/admin/dashboard.html?token=<ADMIN_TOKEN>` (idem `campaigns.html`).

---

## Variables d'environnement

| Variable | Défaut (exemple) | Description |
|----------|------------------|-------------|
| `PORT` | `3000` | Port HTTP du serveur |
| `ADMIN_TOKEN` | `changeme` | Token admin (query `token` ou header `x-admin-token`) |
| `DB_PATH` | `./backend/db/quiz.db` | Chemin du fichier SQLite (relatif au **répertoire courant** au lancement, généralement `quiz-platform/`) |

**Production** : générer un `ADMIN_TOKEN` long et aléatoire ; ne pas réutiliser les valeurs d'exemple.

---

## Déploiement (production)

Il n'y a **pas** de Dockerfile officiel dans ce dépôt : déploiement typique = **Node sur une VM ou un PaaS** qui exécute `node backend/server.js` (ou `npm start`), avec les fichiers du dossier `quiz-platform/` présents.

### Étapes recommandées

1. Cloner ou copier le projet ; `cd quiz-platform`.
2. `npm install --omit=dev` si vous n'avez pas de dépendances de dev séparées (sinon `npm install`).
3. Créer `.env` sur le serveur avec `PORT`, `ADMIN_TOKEN`, `DB_PATH` (chemin absolu ou relatif au répertoire de travail du processus).
4. **Première base** : `npm run seed` **une fois** (ou restaurer une copie de `quiz.db`). Attention : re-seeder peut dupliquer ou écraser selon le script — en prod, privilégier sauvegarde + migrations manuelles ou procédure d'import admin (CSV).
5. Lancer le processus de façon **supervisée** (systemd, PM2, Docker maison, etc.) pour redémarrage automatique.
6. Vérifier que les **assets statiques** sont bien servis : `frontend/assets/shadow-ai-module*.png` (6 illustrations de modules). Ces fichiers PNG font partie du dépôt et sont servis par Express via le montage statique `/frontend`.

### Reverse proxy (HTTPS)

Exposer l'app derrière **nginx**, **Caddy**, **Traefik**, etc. :

- Proxy vers `http://127.0.0.1:<PORT>`.
- Headers standards ; l'app utilise CORS (`cors`) — ajuster si le front est servi depuis un autre domaine.
- Les URLs partagées aux participants doivent utiliser le **domaine public** :  
  `https://votre-domaine.example/quiz?code=CODE`.

### Fichiers persistants

- Le fichier SQLite pointé par `DB_PATH` (+ fichiers `-wal` / `-shm` en mode WAL) doit être sur un volume **persistant** et sauvegardé régulièrement.
- Ne pas déployer plusieurs instances **écrivant** le même fichier SQLite sans mécanisme adapté (SQLite = un writer typique par fichier).

### Sécurité (rappel)

- `ADMIN_TOKEN` secret ; accès admin uniquement en HTTPS.
- Les liens `?code=` sont des secrets faibles mais suffisants pour un usage interne ; diffusion par canal sécurisé (email interne, etc.).

---

## Tests

### Smoke test manuel (après install)

| Étape | Action |
|-------|--------|
| Santé | `GET /` → JSON `status: ok` |
| Participant | `POST /api/start` avec un code valide (voir seed) → 200 + quiz + modules |
| Invalide | `POST /api/start` avec un code bidon → 401, `invalid_code` |
| Admin | `GET /admin/api/users?token=ADMIN_TOKEN` → 200 ; sans token → 403 |
| Illustrations | Ouvrir chaque module (M1–M6) : vérifier que l'image PNG s'affiche (pas de broken image) |
| Rationale | Répondre à une question : vérifier que le panneau « Pourquoi chaque réponse ? » s'affiche avec explications |

Exemples `curl` :

```bash
curl -s -X POST http://localhost:3000/api/start \
  -H 'Content-Type: application/json' \
  -d '{"code":"VOTRE_CODE"}'

curl -s "http://localhost:3000/admin/api/users?token=changeme"
```

(Remplacer `VOTRE_CODE` et le token par les valeurs de votre `.env`.)

### Documentation de test détaillée

| Document | Contenu |
|----------|---------|
| **`TESTING.md`** | Procédure exécutée (setup, API, parcours Puppeteer, admin, cas limites), résultats 40/40, pièges connus (ex. redémarrer le serveur si SQLite semble désynchronisé). |
| **`ai-doc/INTEGRATION-TEST-PLAN.md`** | Plan d'intégration / E2E étendu (232 vérifications) : quiz FR/EN avec illustrations PNG et panneau rationale (`explain_opts`), admin dashboard & campagnes, API isolée, responsive, captures. |

### Tests automatisés

- Le `package.json` expose surtout `start` et `seed` ; les scénarios décrits dans `TESTING.md` peuvent être rejoués avec **curl** + **Puppeteer** (déjà dépendance du projet) selon les scripts ou procédures que vous ajoutez localement.

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| `invalid_code` alors que le code existe en DB | Redémarrer le processus Node ; vérifier que `DB_PATH` pointe bien le bon fichier. |
| Admin 403 | `token` absent ou différent de `ADMIN_TOKEN`. |
| Base vide | Lancer `npm run seed` ou restaurer `quiz.db`. |
| Illustration PNG cassée (broken image) | Vérifier que `frontend/assets/shadow-ai-module*.png` (6 fichiers) sont présents et que le montage statique `/frontend` est actif dans `server.js`. |
| Panneau rationale absent après réponse | Vérifier que `explain_opts` est défini pour chaque question dans `QUIZ_DATA` (FR et EN) dans `quiz.html`. |
