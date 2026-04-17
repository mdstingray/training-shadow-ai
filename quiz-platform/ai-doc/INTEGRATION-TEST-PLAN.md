# Plan de tests d'intégration — Shadow AI Quiz Platform

**Date :** 16 avril 2026 (rév. 5 — refonte du contenu pédagogique du quiz + suppression de la slide « Vue d'ensemble » des modules)
**Auteur :** AI — Plan généré pour exécution manuelle ou automatisée (navigateur, Puppeteer / Playwright)
**Portée :** Tests E2E couvrant tous les écrans, chemins utilisateur et résultats visuels
**URL de base :** `http://localhost:3000`

> **Note rév. 5 — Ce qui a changé côté contenu et structure de module.**
>
> - Chaque module n'a **plus** de slide dédiée « Vue d'ensemble / content ». Le contenu pédagogique (scénario, image, règles clés) s'affiche désormais **en haut de la première question** via la classe `.question-intro` juste au-dessus du `.question-block`.
> - Les **titres de modules** ont été retravaillés côté frontend (`QUIZ_DATA`) et côté seed (`scripts/seed-quiz.js`, refresh par position). Exemples rév. 5 : « Comment des données fuient en 30 secondes », « Où va réellement votre prompt », « Votre boussole Shadow AI ».
> - Les **énoncés, options et explications** de toutes les questions ont été réécrits. Les libellés exacts cités en §2.3.x (ex. « L'utilisation d'outils IA non approuvés… » ou « Sophie… ») **ne correspondent plus au texte en prod** et doivent être traités comme **illustratifs**.
>
> **Règle pratique pour les tests automatisés :** ne pas matcher sur le texte exact d'une option. Dériver l'option correcte via `QUIZ_DATA[...].modules[mIdx].questions[qIdx].correct` (lecture DOM ou via le script) ; sélectionner par **index** les options. Ceci est déjà le motif recommandé par §0.1.
>
> **Impact chiffré inchangé :** toujours **6 modules**, toujours **15 questions au total** (2 + 2 + 2 + 2 + 2 + 5), donc les pourcentages de progression (ex. 13,3 %, 26,7 %…) restent valides.

---

## Table des matières

0. [Principes génériques (agents, contenu variable)](#0-principes-génériques-agents-contenu-variable)
1. [Prérequis et environnement](#1-prérequis-et-environnement)
2. [Écran Quiz — Participant (`/quiz`)](#2-écran-quiz--participant) (inclut §2.0 parcours navigation, §2.8 parcours E2E, §2.9 matrice erreurs)
3. [Écran Admin Dashboard (`/admin/dashboard.html`)](#3-écran-admin-dashboard)
4. [Écran Admin Campagnes (`/admin/campaigns.html`)](#4-écran-admin-campagnes)
5. [Tests API isolés](#5-tests-api-isolés)
6. [Cas limites et interactions croisées](#6-cas-limites-et-interactions-croisées)
7. [Matrice de couverture visuelle](#7-matrice-de-couverture-visuelle)
8. [Test UX automatisé — parcours participant (quiz seul)](#8-test-ux-automatisé--parcours-participant-quiz-seul)

---

## 0. Principes génériques (agents, contenu variable)

Ce plan mélange **régression détaillée** (exemples concrets Shadow AI : titres de modules, 15 questions, etc.) et **règles transportables** : tout changement de mise en page, de nombre de modules ou de copie ne doit pas invalider la stratégie de test — seulement les exemples chiffrés.

### 0.1 Ce qui doit rester découvert dynamiquement

| Objet | Source de vérité | Ne pas figer en dur |
|-------|------------------|---------------------|
| Nombre de modules / questions | `GET /api/start` → `modules`, données client `QUIZ_DATA` / `getModules()` | « 6 modules », « 15 questions », pourcentages de barre exacts |
| Libellés de boutons | Rendu DOM / i18n active | Texte exact « Commencer la formation » (utiliser des sélecteurs stables : `#nextBtn`, `.start-btn`, `.opt-btn`) |
| Illustrations | URLs dans le HTML généré | Noms de fichiers `shadow-ai-module*.png` dans les scénarios automatisés |
| Colonnes admin | Réponse JSON `GET /admin/api/users` | « 10 colonnes » sans vérifier les en-têtes un par un en dur si le produit évolue |

### 0.2 Motifs fonctionnels à couvrir (obligatoires, quel que soit le flux)

Un agent (humain ou IA) exécutant l’intégration doit **explicitement** couvrir chaque **motif** ci-dessous au moins une fois sur l’environnement cible. Les sections détaillées du plan (§2–§6) déclinent ces motifs en cas de test ; si le parcours UI change, les **réimplémenter** avec les mêmes intentions.

| Motif | Intention | Où le trouver dans ce plan |
|-------|-----------|----------------------------|
| **A — Authentification par code** | Code valide → session participant ; code absent / invalide → écran d’erreur clair | §2.1, API §5.1 |
| **B — Chargement / erreur réseau** | Spinner ou équivalent ; pas d’écran blanc silencieux | §2.1.5, §3.1.4, §4.1.4 |
| **C — Parcours linéaire quiz** | Intro → pour chaque module : étapes séquentielles (contenu, questions, interstitiels éventuels) → écran résultats | §2.0, §8 |
| **D — Réponses et feedback** | Sélection → feedback correct/incorrect → panneau rationale / explications si prévu | §2.3.x, §2.8.2, §2.9 |
| **E — Navigation intra-module** | Précédent / Suivant cohérents ; « Suivant » désactivé tant que l’étape exige une action | §2.5 |
| **F — Persistance session** | Refresh milieu de parcours ; `sessionStorage` ou équivalent | §2.6, §7.1 |
| **G — Soumission serveur** | `POST /api/submit` au bon moment, pas de double soumission abusive | §2.7 |
| **H — Admin par token** | Accès autorisé / refus ; filtres, export, campagnes | §3–§4, §5.4 |
| **I — API contrat** | Codes HTTP et champs JSON stables pour les clients | §5 |
| **J — Responsive & a11y** | Pas de scroll horizontal parasite ; focus visible ; `prefers-reduced-motion` | §6.10–§6.14 |

### 0.3 « Beauté » et qualité visuelle

La qualité esthétique subjective est **partiellement** automatisable (voir §8 : débordement, lisibilité minimale, images chargées). Le reste repose sur **§7.2** (critères visuels) et une **revue humaine** ou capture d’écran commentée — l’agent doit toutefois **signaler** toute régression évidente (texte tronqué, icônes manquantes, contrastes cassés).

### 0.4 Test « utilisateur réel » (navigateur) vs contrats techniques

| Rôle | Fichier / pratique | Nature |
|------|---------------------|--------|
| **Parcours participant (UX)** | `scripts/ux-e2e-quiz-user-journey.js` | Puppeteer : clics sur contrôles visibles, attente du **feedback** après une réponse, défilement vers les boutons, pas de `fetch` artificiel pour le cœur du parcours. |
| **Smoke E2E léger** | `scripts/integration-e2e-smoke.js` | Vérifications rapides multi-écrans + points d’API implicites. |
| **Contrats HTTP / JSON** | `curl`, §5, tests manuels | Pas de substitut au navigateur pour l’expérience ; pas de substitut au curl pour le schéma d’API. |

Le script UX (§8) couvre **visibilité**, **images à l’écran**, **liens same-origin visibles** (scroll + clic si présents), **parcours complet** et **heuristiques de layout**. Il ne remplace pas **§2.8** (erreurs volontaires), ni les tests **API**, **admin**, ni **FR/EN** complets.

---

## 1. Prérequis et environnement

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 1.1 | Installation des dépendances | `cd quiz-platform && npm install` | `node_modules/` créé, 0 erreurs | — |
| 1.2 | Seed de la base | `node scripts/seed-quiz.js` | 5 utilisateurs créés, 5 liens imprimés, 1 campagne « Stingray Town Hall 2026 », 6 modules | — |
| 1.3 | Démarrage serveur | `node backend/server.js` | Port 3000, `GET /` → `{"status":"ok"}` | — |
| 1.4 | Fichier DB créé | `ls backend/db/quiz.db` | Fichier présent | — |
| 1.5 | Health-check JSON | `curl http://localhost:3000/` | `200 {"status":"ok","message":"Shadow AI Quiz Platform"}` | — |
| 1.6 | Assets illustrations du quiz | Lister les fichiers référencés par le front (images dans `QUIZ_DATA` / HTML) ou `ls frontend/assets/*` selon conventions du dépôt | Toutes les ressources attendues présentes sur disque | — |

---

## 2. Écran Quiz — Participant

Les tableaux §2.3.x utilisent des **exemples** (titres, nombre de modules, formulations) correspondant au dépôt actuel. Pour une autre formation ou une refonte, **répliquer les mêmes types de vérification** (illustration visible, mauvaise réponse, interstitiel, etc.) en s’appuyant sur le DOM et l’API, pas sur le texte exact.

### 2.0 Parcours de navigation séquentielle (recommandé)

Ce parcours décrit le **flux réel d'un utilisateur** dans le navigateur (clics successifs, comme une session manuelle ou un scénario Puppeteer / Playwright / MCP navigateur). Il complète les tableaux détaillés des §2.1 à 2.7.

**Principe :** une URL avec code → intro → **Commencer la formation** → enchaîner les modules par **Suivant →** jusqu'au module 6, puis **Voir mes résultats →**.

| Étape | Action utilisateur | Résultat attendu |
|-------|-------------------|------------------|
| N1 | Ouvrir `/quiz?code=<CODE_VALIDE>` | Chargement puis intro : badge nom, FR/EN, bouton « Commencer la formation » |
| N2 | (Optionnel) basculer EN puis FR | Textes cohérents avec la langue active |
| N3 | Cliquer « Commencer la formation » | Module 1 affiché ; barre de progression et nav-bar visibles ; « ← Précédent » désactivé |
| N4 | Répondre aux questions du module courant | Feedback vert ou rouge ; panneau « Pourquoi chaque réponse ? » visible ; « Suivant → » actif seulement quand toutes les questions du module ont une réponse |
| N5 | Cliquer « Suivant → » (modules 1 à 5) | Passage au module suivant (animation courte) ; soumission `POST /api/submit` pour le module quitté (voir §2.7) |
| N6 | Module 6 : répondre aux 5 Vrai/Faux | Puis activer **Voir mes résultats →** (libellé distinct de « Suivant → ») |
| N7 | Écran résultats | Score, pourcentage, récap 15 questions, messages clés, bouton « Recommencer » |
| N8 | (Optionnel) « Recommencer » | Retour intro ; état local réinitialisé (sauf langue en `sessionStorage`) |

**Barre de progression (à ne pas confondre avec le libellé « Module X de 6 ») :** dans l'implémentation actuelle, le **remplissage** de la barre suit les **réponses données / 15 questions** (pas 1/6 modules). Le texte « Module X de 6 » indique l'étape logique ; les pourcentages du type « ~16,67 % par module » du plan historique correspondent au **nombre de modules complétés** si on les interprète ainsi — pour la barre visuelle, se référer au **nombre de questions déjà répondues**.

**Outils :** navigateur intégré (Cursor), Chrome + DevTools (Network), ou `node scripts/integration-e2e-smoke.js` pour une exécution partielle automatisée.

### 2.1 Chargement et authentification par code

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.1.1 | Chargement avec code valide | Ouvrir `/quiz?code=<CODE_VALIDE>` | Écran d'intro affiché ; badge utilisateur visible avec le nom (ex. « Alice Martin ») | **Screenshot :** header avec badge nom, bouton FR/EN, titre « Shadow AI — Stingray ». L'intro montre « Bienvenue, Alice Martin » et le bouton « Commencer la formation ». Fond sombre avec gradient bleu. |
| 2.1.2 | Chargement sans code | Ouvrir `/quiz` (sans `?code=`) | Écran d'erreur « Lien invalide » | **Screenshot :** écran centré avec titre rouge « Lien invalide » et message « Lien invalide — contacte ton admin. » Pas de bouton de navigation. |
| 2.1.3 | Code invalide | Ouvrir `/quiz?code=INVALIDXYZ` | Écran d'erreur identique au 2.1.2 | **Screenshot :** même rendu que 2.1.2 — titre rouge, message d'erreur. |
| 2.1.4 | Code valide en majuscules/minuscules | Ouvrir `/quiz?code=<code_en_minuscules>` | Selon la sensibilité de la casse dans `resolveCode` : erreur 401 si la casse ne correspond pas | **Screenshot :** écran d'erreur si la casse ne matche pas. |
| 2.1.5 | Écran de chargement transitoire | Ouvrir `/quiz?code=<CODE_VALIDE>` — observer avant la réponse API | Spinner et texte « Chargement... / Loading... » visible brièvement | **Screenshot :** spinner centré avec texte bilingue sur fond sombre. |

### 2.2 Basculement de langue (FR/EN)

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.2.1 | Langue par défaut FR | Ouvrir `/quiz?code=<CODE>` | Bouton FR actif (bleu). Titre intro en français. | **Screenshot :** bouton FR surligné en bleu, bouton EN gris. Texte « Formation Shadow AI ». |
| 2.2.2 | Basculer vers EN | Cliquer sur le bouton « EN » | Tout le texte bascule en anglais. Bouton EN actif. | **Screenshot :** bouton EN surligné, titre « Shadow AI Training », bouton « Start Training ». |
| 2.2.3 | Revenir à FR | Cliquer sur « FR » après être passé en EN | Texte revient en français | **Screenshot :** cohérent avec 2.2.1. |
| 2.2.4 | Langue persistée après refresh | Passer en EN → recharger la page | La langue reste en EN (sauvegardée dans `sessionStorage`) | **Screenshot :** même état EN après rechargement. |
| 2.2.5 | Langue pendant un module | Démarrer le quiz en FR, naviguer au module 2, basculer en EN | Le contenu du module 2 s'affiche en anglais, **y compris l'illustration** (même image, légende EN) | **Screenshot :** titre module 2 « Real Risks » au lieu de « Les risques réels ». |

### 2.3 Parcours complet — Modules 1 à 6

#### 2.3.0 Écran d'introduction

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.0a | Affichage intro | Code valide → page chargée | Titre « Formation Shadow AI », description, bouton « Commencer » | **Screenshot :** carte centrée, message de bienvenue avec nom, description du quiz, bouton bleu « Commencer la formation ». |
| 2.3.0b | Clic sur « Commencer » | Cliquer le bouton de démarrage | Module 1 s'affiche, barre de progression visible à 0%, nav-bar apparaît | **Screenshot :** module 1 visible, barre de progression à 0%, bouton « Précédent » désactivé (grisé), bouton « Suivant » désactivé. |

#### 2.3.1 Module 1 — « Comment des données fuient en 30 secondes »

> _Rév. 5 : les lignes ci-dessous réfèrent à l'ancien texte des questions (définition + exemples de Shadow AI). Les intentions de test restent valides (option correcte / incorrecte, feedback, rationale) ; matcher par **index** ou via le JS plutôt que par texte._

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.1a | Contenu du module | Arriver au module 1 | Tag « Module 1 », titre, contenu avec scénario de Lena, illustration PNG, liste du Shadow AI, message clé SSO | **Screenshot :** tag bleu clair « MODULE 1 », titre en gras, carte scénario avec bordure bleue, image `shadow-ai-module1.png` avec légende, liste à puces, encart bleu « SSO d'abord ». |
| 2.3.1b | Illustration module 1 | Vérifier le chargement de l'image `/frontend/assets/shadow-ai-module1.png` | Image visible, pas de broken image, coins arrondis | **Screenshot :** illustration visible avec `border-radius` et ombre, légende en dessous. |
| 2.3.1c | Question 1 — réponse correcte | Cliquer « L'utilisation d'outils IA non approuvés par l'entreprise... » (option B, index 1) | Bouton vert, feedback vert « Exact ! ... », options désactivées, **panneau rationale** affiché | **Screenshot :** bouton sélectionné avec bordure verte et fond vert clair, feedback vert en dessous, boîte « Pourquoi chaque réponse ? » avec 4 explications, bonne réponse marquée ✓ vert. |
| 2.3.1d | Question 1 — réponse incorrecte | Cliquer « Un type d'IA qui fonctionne uniquement dans le dark web » (option A, index 0) | Bouton rouge, feedback rouge, la bonne réponse révélée en vert, **panneau rationale** avec ✗ rouge sur le mauvais choix | **Screenshot :** bouton sélectionné rouge, bonne réponse (index 1) en vert, feedback rouge « La bonne réponse : ... », boîte rationale avec ✗ rouge sur le mauvais choix et ✓ vert sur le bon. |
| 2.3.1e | Contenu entre questions (spacer `betweenQuestions`) | Après avoir répondu à Q1 | Bloc « Avant la question suivante » avec signaux d'alerte | **Screenshot :** séparateur horizontal pointillé, titre « Avant la question suivante » en surbrillance, liste de signaux d'alerte. |
| 2.3.1f | Question 2 — réponse correcte | Cliquer « Coller des données clients dans un ChatGPT personnel » (option B) | Feedback correct vert, panneau rationale | **Screenshot :** idem pattern 2.3.1c. |
| 2.3.1g | Question 2 — réponse incorrecte | Cliquer une mauvaise réponse | Feedback incorrect rouge, panneau rationale | **Screenshot :** idem pattern 2.3.1d. |
| 2.3.1h | Bouton Suivant activé | Répondre aux 2 questions | Bouton « Suivant → » activé (bleu), score nav-bar mis à jour | **Screenshot :** bouton « Suivant → » bleu actif, score affiché au centre de la nav-bar (ex. « 2 / 2 pts »). |
| 2.3.1i | Barre de progression | Après complétion module 1 | Remplissage basé sur **réponses / 15 questions** (ex. 2/15 ≈ 13,3 %) ; libellé « Module 1 de 6 » | **Screenshot :** barre partielle cohérente avec le nombre de questions répondues, texte « Module 1 de 6 ». Voir §2.0 (note barre). |

#### 2.3.2 Module 2 — « Où va réellement votre prompt »

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.2a | Navigation vers module 2 | Cliquer « Suivant → » | Module 2 affiché avec animation de slide, **illustration `shadow-ai-module2-risks.png` visible** | **Screenshot :** tag « MODULE 2 », titre « Les risques réels », illustration PNG des risques, liste des risques (fuite, non-conformité, perte de contrôle, réputation), message clé « Help Desk ». |
| 2.3.2b | Bouton « Précédent » actif | Vérifier le bouton ← | Bouton « ← Précédent » cliquable | **Screenshot :** bouton avec bordure visible, texte « ← Précédent ». |
| 2.3.2c | Q1 — Sophie et les données de revenus — correct | Cliquer « Oui, c'est une fuite... » (option C, index 2) | Feedback vert, panneau rationale | **Screenshot :** pattern standard réponse correcte + rationale. |
| 2.3.2d | Q1 — Sophie — incorrect (option A) | Cliquer « Non, tant qu'elle supprime... » | Feedback rouge, panneau rationale | **Screenshot :** pattern standard réponse incorrecte + rationale. |
| 2.3.2e | Q1 — Sophie — incorrect (option B) | Cliquer « Peut-être, ça dépend... » | Feedback rouge, panneau rationale | **Screenshot :** pattern standard réponse incorrecte + rationale. |
| 2.3.2f | Q2 — Types de données — correct | Cliquer « Données clients, revenus, contrats... » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.2g | Q2 — Types de données — incorrect (chaque option) | Tester les 3 mauvaises réponses (index 0, 2, 3) | Feedback rouge pour chacune, panneau rationale | **Screenshot :** 3 captures distinctes montrant le feedback pour chaque mauvais choix. |
| 2.3.2h | Progression mise à jour | Compléter M2 | Remplissage **4/15** (ou selon réponses données) ; libellé « Module 2 de 6 » | **Screenshot :** barre cohérente avec les réponses cumulées, texte « Module 2 de 6 ». |

#### 2.3.3 Module 3 — « Votre boîte à outils approuvée »

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.3a | Contenu module 3 | Naviguer au module 3 | Titre, illustration `shadow-ai-module3-tools.png`, liste SSO/outils validés/exemples, message clé « Règle SSO » | **Screenshot :** contenu avec illustration PNG, liste (SSO obligatoire, outils validés, exemples Copilot), encart bleu « Règle SSO ». |
| 2.3.3b | Q1 — Règle SSO — correct | Cliquer « Il faut toujours utiliser son compte corporatif... » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.3c | Q1 — Règle SSO — incorrect (chaque option) | Tester index 0, 2, 3 | Feedback rouge, panneau rationale | **Screenshot :** 3 captures. |
| 2.3.3d | Q2 — Marc et Product Hunt — correct | Cliquer « Oui, tout outil non approuvé... » (index 2) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.3e | Q2 — Marc — incorrect (chaque option) | Tester index 0, 1 | Feedback rouge, panneau rationale | **Screenshot :** 2 captures. |
| 2.3.3f | Progression | Compléter M3 | Remplissage **6/15 = 40%** si tout correct jusqu'ici ; libellé « Module 3 de 6 » | **Screenshot :** barre à 40 % environ, cohérent avec §2.0. |

#### 2.3.4 Module 4 — « Zone grise : les pièges que même les gens prudents font »

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.4a | Contenu module 4 | Naviguer au module 4 | Illustration `shadow-ai-module4-process.png`, liste ordonnée (Help Desk → évaluation → approbation → déploiement), message clé | **Screenshot :** illustration PNG, liste numérotée 1-4, encart « En cas de doute — demandez ! ». |
| 2.3.4b | Q1 — Première étape — correct | Cliquer « Contacter le Help Desk... » (index 2) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.4c | Q1 — Première étape — incorrect (chaque option) | Tester index 0, 1, 3 | Feedback rouge, panneau rationale | **Screenshot :** 3 captures. |
| 2.3.4d | Q2 — Données interdites — correct | Cliquer « Toute donnée d'entreprise... » (index 2) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.4e | Q2 — Données interdites — incorrect (chaque option) | Tester index 0, 1, 3 | Feedback rouge, panneau rationale | **Screenshot :** 3 captures. |
| 2.3.4f | Progression | Compléter M4 | Remplissage **8/15** si tout correct ; libellé « Module 4 de 6 » | **Screenshot :** barre cohérente avec §2.0. |

#### 2.3.5 Module 5 — « Sous pression, sans céder »

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.5a | Contenu module 5 | Naviguer au module 5 | Illustration `shadow-ai-module5-scenarios.png`, rappel des 3 réflexes, message clé | **Screenshot :** illustration PNG, encart jaune/bleu « Rappel — Les trois réflexes ». |
| 2.3.5b | Q1 — Collègue et contrat — correct | Cliquer « Vous informez votre collègue... » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.5c | Q1 — Collègue — incorrect (chaque option) | Tester index 0, 2 | Feedback rouge, panneau rationale | **Screenshot :** 2 captures. |
| 2.3.5d | Q2 — Gestionnaire et urgence — correct | Cliquer « Vous contactez le Help Desk en urgence... » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.5e | Q2 — Gestionnaire — incorrect (chaque option) | Tester index 0, 2 | Feedback rouge, panneau rationale | **Screenshot :** 2 captures. |
| 2.3.5f | Progression | Compléter M5 | Remplissage **10/15** si tout correct ; libellé « Module 5 de 6 » | **Screenshot :** barre cohérente avec §2.0. |

#### 2.3.6 Module 6 — « Votre boussole Shadow AI »

> _Rév. 5 : ce module est désormais un capstone de 5 décisions nuancées (mix 2/3/4 options), plus seulement des Vrai/Faux. Les tests « option correcte / incorrecte + rationale » restent valables, mais les libellés exacts ci-dessous ne correspondent plus au contenu._

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.3.6a | Contenu module 6 | Naviguer au module 6 | Titre « Quiz final — Vrai ou Faux », illustration `shadow-ai-module6-quiz.png`, intro | **Screenshot :** tag « MODULE 6 », titre, illustration PNG, intro courte. |
| 2.3.6b | Q1 — ChatGPT personnel + client — FAUX (correct) | Cliquer « Faux » (index 1) | Feedback vert « FAUX ! », panneau rationale | **Screenshot :** bouton « Faux » vert, feedback avec explication, rationale. |
| 2.3.6c | Q1 — VRAI (incorrect) | Cliquer « Vrai » (index 0) | Feedback rouge, panneau rationale | **Screenshot :** « Vrai » rouge, « Faux » révélé vert, rationale. |
| 2.3.6d | Q2 — Copilot SSO — VRAI (correct) | Cliquer « Vrai » (index 0) | Feedback vert « VRAI ! », panneau rationale | **Screenshot :** bouton « Vrai » vert. |
| 2.3.6e | Q2 — FAUX (incorrect) | Cliquer « Faux » (index 1) | Feedback rouge, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6f | Q3 — Code propriétaire — FAUX (correct) | Cliquer « Faux » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6g | Q3 — VRAI (incorrect) | Cliquer « Vrai » (index 0) | Feedback rouge, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6h | Q4 — Help Desk — VRAI (correct) | Cliquer « Vrai » (index 0) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6i | Q4 — FAUX (incorrect) | Cliquer « Faux » (index 1) | Feedback rouge, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6j | Q5 — Données IA gratuit — FAUX (correct) | Cliquer « Faux » (index 1) | Feedback vert, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6k | Q5 — VRAI (incorrect) | Cliquer « Vrai » (index 0) | Feedback rouge, panneau rationale | **Screenshot :** pattern standard. |
| 2.3.6l | Bouton « Voir mes résultats → » | Répondre aux 5 questions du module 6 | Bouton « Voir mes résultats → » actif | **Screenshot :** bouton bleu « Voir mes résultats → » au lieu de « Suivant → ». |
| 2.3.6m | Progression 100% | Avant de cliquer résultats | Barre à 100% | **Screenshot :** barre entièrement remplie, gradient bleu complet. |

### 2.4 Écran de résultats

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.4.1 | Score parfait (15/15) | Compléter tous les modules avec 100% correct | Score « 15 / 15 » affiché, pourcentage 100%, message « Excellent ! » | **Screenshot :** grande carte centrée, score en dégradé blanc→bleu « 15 / 15 », « 100% », message vert « Excellent ! Vous maîtrisez... ». |
| 2.4.2 | Score partiel (ex. 10/15) | Compléter avec quelques erreurs | Score « 10 / 15 », ~67%, message « Bon travail ! » | **Screenshot :** score affiché, message encourageant jaune/neutre. |
| 2.4.3 | Score faible (ex. 5/15) | Compléter avec beaucoup d'erreurs | Score « 5 / 15 », ~33%, message « Des efforts sont nécessaires... » | **Screenshot :** score affiché, message d'avertissement. |
| 2.4.4 | Récapitulatif par question | Vérifier la liste de récap | 15 lignes, chaque question avec icône ✓ (vert) ou ✗ (rouge) | **Screenshot :** liste avec icônes alignées à gauche, texte de la question à droite, bordures séparatrices fines. |
| 2.4.5 | Messages clés à retenir | Vérifier la section « Messages clés » | 3 messages avec emojis (SSO, Help Desk, doute) | **Screenshot :** encart bleu avec titre « Messages clés à retenir », 3 puces avec emojis 🔐 🎫 ❓. |
| 2.4.6 | Bouton « Recommencer » | Vérifier la présence du bouton | Bouton bleu « Recommencer » visible | **Screenshot :** bouton bleu centré sous les messages clés. |
| 2.4.7 | Clic « Recommencer » | Cliquer « Recommencer » | Retour à l'écran d'intro. `sessionStorage` effacé (sauf lang). Barre de progression cachée. | **Screenshot :** retour à l'intro avec bouton « Commencer la formation ». |
| 2.4.8 | Résultats en anglais | Compléter en EN | Score affiché, « Results », « Key Takeaways », « Start Over » | **Screenshot :** mêmes éléments en anglais. |

### 2.5 Navigation et barre de progression

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.5.1 | Bouton Précédent — module 1 | Au module 1, vérifier le bouton | Bouton « ← Précédent » désactivé (grisé) ou ramène à l'intro | **Screenshot :** bouton grisé sans effet hover. |
| 2.5.2 | Bouton Précédent — module 3 → module 2 | Au module 3, cliquer ← | Module 2 s'affiche avec les réponses précédemment données | **Screenshot :** module 2 avec réponses sauvegardées (boutons colorés, feedback visible). |
| 2.5.3 | Bouton Suivant désactivé | Arriver au module 3 sans répondre | Bouton « Suivant → » désactivé | **Screenshot :** bouton grisé, cursor `not-allowed`. |
| 2.5.4 | Score nav-bar cumulatif | Compléter M1 (2/2), M2 (1/2) | Score nav-bar « 3 / 4 pts » | **Screenshot :** texte centré dans la nav-bar. |
| 2.5.5 | Barre de progression — gradient | Observer la barre à ~50% | Dégradé bleu → cyan, ombre lumineuse | **Screenshot :** barre avec gradient `#0070e0` → `#5ad0ff` → `#7ddbff`, glow cyan. |

### 2.6 Persistance (`sessionStorage`)

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.6.1 | Refresh mid-module | Répondre à Q1 du module 3 → recharger la page | Module 3 toujours affiché, Q1 avec réponse sauvegardée | **Screenshot :** même état visuel qu'avant le refresh. |
| 2.6.2 | Refresh après complétion module | Compléter M2, naviguer à M3 → recharger | Module 3 affiché, M1 et M2 marqués complétés | **Screenshot :** barre de progression cohérente. |
| 2.6.3 | Nouvelle session (autre onglet) | Ouvrir `/quiz?code=<MEME_CODE>` dans un nouvel onglet | Session indépendante (autre `sessionStorage`) — recommence à l'intro | **Screenshot :** intro affichée dans le nouvel onglet. |
| 2.6.4 | Code différent = état séparé | Onglet 1 : code Alice au M3, onglet 2 : code Bob | Chaque onglet a son propre état et nom | **Screenshot :** onglet 1 « Alice Martin » au M3, onglet 2 « Bob Tremblay » à l'intro. |

### 2.7 Soumission API (`POST /api/submit`)

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 2.7.1 | Soumission automatique au changement de module | Compléter M1 → cliquer « Suivant » | `POST /api/submit` envoyé avec `code`, `module_id`, `score`, `time_spent_seconds` | Vérifier dans l'onglet Network du navigateur : requête POST 200, body JSON correct. |
| 2.7.2 | Pas de double soumission | Revenir au M1 après l'avoir complété, puis avancer à M2 | Pas de nouvel appel `POST /api/submit` pour M1 | Vérifier dans Network : une seule requête pour M1. |
| 2.7.3 | Score correct envoyé | Compléter M1 avec 1/2 correct | `score` = 50 dans le body | Inspecter le body de la requête dans Network. |
| 2.7.4 | Temps enregistré | Passer 30+ secondes sur un module → naviguer | `time_spent_seconds` > 0 | Inspecter le body de la requête. |

### 2.8 Parcours E2E obligatoires — succès et erreurs

En complément du §2.0, **au moins trois parcours** doivent être exécutés et documentés (captures ou journal de test) :

| # | Parcours | Objectif | Étapes résumées | Résultat attendu |
|---|----------|----------|-----------------|------------------|
| 2.8.1 | **A — Réussite complète** | Valider le flux nominal | Suivre §2.0 (N1–N7) en ne choisissant **que des bonnes réponses** | Score **15 / 15**, message « Excellent ! », récap tout vert |
| 2.8.2 | **B — Erreurs réparties** | Valider UI et scoring des **mauvaises** réponses | Suivre §2.0 en introduisant **au moins une réponse incorrecte par module** (1 à 6), les autres questions du même module pouvant être correctes pour permettre « Suivant → ». Utiliser **plusieurs sessions** (`Recommencer` ou **autre code participant**) si besoin pour isoler des cas. | Feedback **rouge** à chaque erreur, bonne option **révélée** (vert), panneau `explain_opts` / rationale ; score final **< 15** ; récap avec **✓ et ✗** |
| 2.8.3 | **C — Toutes incorrectes (optionnel mais recommandé)** | Vérifier score minimal et libellés | Répondre **incorrectement à toutes** les questions (ou le maximum possible sans bloquer la navigation) | Score **0 / 15** (ou proche), message « Des efforts sont nécessaires… » — croiser avec §6.15 |

**Règle UX importante :** après un clic sur une option, les boutons sont **désactivés** — on ne peut pas « corriger » une question sans **Recommencer** ou **nouvelle session** (autre onglet / autre code). Pour tester **plusieurs** mauvaises options sur la **même** question (ex. les 3 mauvais choix de la Q2 du module 2), enchaîner des **sessions distinctes** (voir déjà §2.3.2g).

### 2.9 Matrice minimale — réponses incorrectes par module

Pour la campagne **B** (§2.8.2), couvrir **au minimum** les cas suivants (croiser avec les tests détaillés §2.3.x). Chaque ligne = une **session** ou enchaînement après **Recommencer** jusqu'à couvrir la ligne.

| Module | Question | Réponse incorrecte à jouer (exemple) | IDs de référence (détail) | Vérifications obligatoires après clic |
|--------|------------|----------------------------------------|---------------------------|--------------------------------------|
| 1 | Q1 | Option A — « dark web » | §2.3.1d | Bouton rouge, feedback rouge, bonne réponse en vert, panneau rationale avec `explain_opts` |
| 1 | Q2 | Toute option autre que « ChatGPT personnel » | §2.3.1g | Idem pattern incorrect + rationale |
| 2 | Q1 | Option A ou B (Sophie) | §2.3.2d, §2.3.2e | Idem |
| 2 | Q2 | Chaque mauvaise option (sessions séparées si besoin) | §2.3.2g | Feedback rouge pour chaque index incorrect testé + rationale |
| 3 | Q1 | Index 0, 2 ou 3 (hors « SSO corporatif ») | §2.3.3c | Idem |
| 3 | Q2 | Index 0 ou 1 (hors réponse « outil non approuvé TI ») | §2.3.3e | Idem |
| 4 | Q1 | Index 0, 1 ou 3 (hors Help Desk) | §2.3.4c | Idem |
| 4 | Q2 | Index 0, 1 ou 3 (hors « toute donnée d'entreprise ») | §2.3.4e | Idem |
| 5 | Q1 | Index 0 ou 2 | §2.3.5c | Idem |
| 5 | Q2 | Index 0 ou 2 | §2.3.5e | Idem |
| 6 | Q1 à Q5 | Pour chaque question, tester au moins une fois **Vrai** si la bonne réponse est **Faux**, et inversement | §2.3.6b–2.3.6k | Feedback « VRAI ! » / « FAUX ! » ou rouge ; bonne réponse révélée + rationale |

**Critère de passage QA :** toutes les lignes de la matrice ont été **exécutées au moins une fois** sur l'environnement cible, ou les écarts sont documentés (bug ou limitation connue).

---

## 3. Écran Admin Dashboard

### 3.1 Authentification et accès

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.1.1 | Accès avec token valide | Ouvrir `/admin/dashboard.html?token=changeme` | Dashboard chargé avec tableau d'utilisateurs | **Screenshot :** header avec titre « Admin — Shadow AI Quiz », liens Campagnes/Actualiser/Export CSV, tableau avec 5 lignes. |
| 3.1.2 | Accès sans token | Ouvrir `/admin/dashboard.html` | Message « Non autorisé » et instruction | **Screenshot :** texte rouge centré « Non autorisé », instruction « Ajoutez `?token=…` à l'URL. » |
| 3.1.3 | Token invalide | Ouvrir `/admin/dashboard.html?token=wrong` | Message « Token admin invalide » | **Screenshot :** texte rouge « Non autorisé », « Token admin invalide. » |
| 3.1.4 | Serveur indisponible | Couper le serveur → ouvrir la page | Message « Connexion au serveur impossible » | **Screenshot :** message d'erreur réseau. |

### 3.2 Cartes de statistiques

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.2.1 | Total participants | Vérifier la première carte stat | Nombre total = 5 (après seed) | **Screenshot :** carte avec valeur « 5 » en bleu cyan, label « Participants (liste) ». |
| 3.2.2 | Terminé | Vérifier la carte « Terminé » | Nombre d'utilisateurs ayant complété (vert) | **Screenshot :** valeur en vert. |
| 3.2.3 | En cours | Vérifier la carte | Nombre en cours (jaune/orange) | **Screenshot :** valeur en jaune. |
| 3.2.4 | Pas commencé | Vérifier la carte | Nombre pas commencé (rouge) | **Screenshot :** valeur en rouge. |
| 3.2.5 | Mise à jour après quiz | Un utilisateur complète le quiz → actualiser | Compteurs mis à jour | **Screenshot :** avant/après comparaison. |

### 3.3 Sélecteur de campagne

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.3.1 | Option par défaut | Vérifier le select | « Toutes les campagnes » sélectionné | **Screenshot :** dropdown avec texte « Toutes les campagnes ». |
| 3.3.2 | Sélectionner une campagne | Choisir « Stingray Town Hall 2026 » | Tableau filtré aux participants de cette campagne, stats recalculées | **Screenshot :** seulement les participants de la campagne. |
| 3.3.3 | Retour à « Toutes » | Re-sélectionner « Toutes les campagnes » | Tous les participants affichés | **Screenshot :** tableau complet. |
| 3.3.4 | URL CSV mise à jour | Sélectionner campagne → vérifier le lien Export CSV | `href` contient `&campaign_id=<id>` | Inspecter le `href` du lien. |

### 3.4 Échéance (deadline)

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.4.1 | Input désactivé sans campagne | Aucune campagne sélectionnée | Input date grisé, curseur `not-allowed` | **Screenshot :** input avec opacité réduite, texte « Choisissez une campagne pour modifier l'échéance ». |
| 3.4.2 | Input activé avec campagne | Sélectionner une campagne | Input date actif | **Screenshot :** input date avec bordure normale. |
| 3.4.3 | Modifier la deadline | Changer la date → observer | Message « Enregistré. » apparaît 2 secondes | **Screenshot :** texte « Enregistré. » visible à côté de l'input. |
| 3.4.4 | Deadline persistée | Modifier → actualiser la page | La date est conservée | **Screenshot :** date correcte dans l'input après refresh. |
| 3.4.5 | Erreur réseau sur deadline | Couper le serveur → modifier | Message « Erreur » | **Screenshot :** texte « Erreur » en rouge/gris. |

### 3.5 Filtres de statut

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.5.1 | Filtre « Tous » actif par défaut | Charger le dashboard | Bouton « Tous » surligné, tous les participants affichés | **Screenshot :** bouton « Tous (5) » avec bordure bleue et fond bleu léger. |
| 3.5.2 | Filtre « Terminé » | Cliquer « Terminé » | Seuls les utilisateurs `completed` affichés, bouton surligné | **Screenshot :** bouton « Terminé » actif, lignes filtrées avec badge vert « Terminé ». |
| 3.5.3 | Filtre « En cours » | Cliquer « En cours » | Seuls les `in_progress` affichés | **Screenshot :** badge jaune « En cours ». |
| 3.5.4 | Filtre « Pas commencé » | Cliquer « Pas commencé » | Seuls les `not_started` affichés | **Screenshot :** badge rouge « Pas commencé ». |
| 3.5.5 | Filtre avec 0 résultat | Si aucun « En cours » → cliquer le filtre | Message « Aucun participant. » | **Screenshot :** cellule centrée « Aucun participant. » en gris. |
| 3.5.6 | Compteurs dans les boutons | Vérifier les labels | Chaque bouton montre le nombre entre parenthèses | **Screenshot :** ex. « Tous (5) », « Terminé (2) », « En cours (0) », « Pas commencé (3) ». |

### 3.6 Tableau des participants

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.6.1 | Colonnes du tableau | Vérifier les en-têtes | 10 colonnes : Campagne, Nom, Courriel, Superviseur, Courriel sup., Statut, Score moy., Temps, Tentatives, Terminé le | **Screenshot :** en-têtes gris sur fond sombre. |
| 3.6.2 | Données correctes | Vérifier une ligne d'utilisateur complété | Nom en gras, courriel, badge « Terminé » vert, score %, temps formaté, nombre de tentatives, date | **Screenshot :** ligne avec toutes les colonnes remplies. |
| 3.6.3 | Utilisateur non commencé | Vérifier une ligne `not_started` | Score « — », temps « — », tentatives « — », date « — » | **Screenshot :** tirets dans les colonnes numériques. |
| 3.6.4 | Hover sur ligne | Survoler une ligne du tableau | Léger surlignage bleu | **Screenshot :** ligne avec fond `rgba(0,112,224,.04)`. |
| 3.6.5 | Superviseur manquant | Utilisateur sans superviseur | « — » dans les colonnes superviseur | **Screenshot :** tirets pour superviseur et courriel sup. |
| 3.6.6 | Format du temps | Utilisateur avec 125 secondes | « 2m 5s » | **Screenshot :** cellule avec format minutes/secondes. |

### 3.7 Export CSV

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.7.1 | Télécharger CSV (toutes campagnes) | Cliquer « Export CSV » sans campagne sélectionnée | Fichier `quiz-export.csv` téléchargé, UTF-8 BOM, en-têtes + données | Ouvrir le CSV : vérifier les colonnes et les données. |
| 3.7.2 | Télécharger CSV (campagne filtrée) | Sélectionner une campagne → « Export CSV » | CSV filtré à cette campagne | Ouvrir le CSV : seulement les participants de la campagne. |
| 3.7.3 | Lien CSV avec bon token | Inspecter le `href` | Contient `token=changeme` | Inspecter l'élément. |

### 3.8 Bouton Actualiser

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.8.1 | Actualiser recharge les données | Un quiz terminé entre-temps → cliquer « Actualiser » | Données rafraîchies, compteurs mis à jour | **Screenshot :** avant/après comparaison des stats. |

### 3.9 Lien Campagnes

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 3.9.1 | Navigation vers campagnes | Cliquer « Campagnes » | Redirigé vers `/admin/campaigns.html?token=changeme` | **Screenshot :** page campagnes chargée. |

---

## 4. Écran Admin Campagnes

### 4.1 Authentification et accès

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.1.1 | Accès avec token valide | Ouvrir `/admin/campaigns.html?token=changeme` | Page chargée avec formulaire + tableau | **Screenshot :** header « Campagnes », lien « ← Tableau de bord », 3 cartes (formulaire, format CSV, campagnes existantes). |
| 4.1.2 | Accès sans token | Ouvrir `/admin/campaigns.html` | « Non autorisé » | **Screenshot :** message d'erreur rouge. |
| 4.1.3 | Token invalide | Ouvrir `?token=wrong` | « Token admin invalide » | **Screenshot :** message d'erreur. |
| 4.1.4 | Serveur indisponible | Couper le serveur → ouvrir | « Impossible de joindre le serveur » | **Screenshot :** message réseau. |

### 4.2 Formulaire de création de campagne

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.2.1 | Formulaire visible | Charger la page | Carte « Nouvelle campagne » avec 3 champs + bouton | **Screenshot :** formulaire avec champs Nom, Questionnaire (select), Échéance (date), bouton « Créer la campagne ». |
| 4.2.2 | Créer une campagne — succès | Remplir nom « Test Montréal », sélectionner quiz, date optionnelle → soumettre | Message « Campagne créée. », tableau mis à jour avec la nouvelle campagne | **Screenshot :** message vert « Campagne créée. » sous le formulaire, nouvelle ligne dans le tableau. |
| 4.2.3 | Créer sans nom (validation HTML) | Laisser le champ nom vide → soumettre | Validation native du navigateur bloque la soumission | **Screenshot :** bulle de validation « Veuillez remplir ce champ ». |
| 4.2.4 | Créer sans quiz sélectionné | Si pas de quiz → soumettre | Erreur 400 ou validation | **Screenshot :** message d'erreur rouge. |
| 4.2.5 | Créer avec deadline | Remplir tous les champs y compris deadline → soumettre | Campagne créée avec deadline affichée dans le tableau | **Screenshot :** ligne avec date dans la colonne Échéance. |
| 4.2.6 | Créer sans deadline | Nom + quiz, pas de deadline → soumettre | Campagne créée, « — » dans la colonne Échéance | **Screenshot :** « — » dans la colonne date. |
| 4.2.7 | Erreur réseau | Couper le serveur → soumettre | Message « Erreur réseau » rouge | **Screenshot :** message rouge « Erreur réseau ». |
| 4.2.8 | Quiz non trouvé (ID invalide) | Forger une requête avec `quiz_id` inexistant | Erreur 404 | Vérifier la réponse API. |

### 4.3 Carte « Format CSV attendu »

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.3.1 | Contenu d'aide | Vérifier la carte | Description des colonnes FR/EN + exemple CSV dans un `<pre>` | **Screenshot :** carte avec texte explicatif et bloc de code formaté montrant `nom_employe,email,nom_superviseur,courriel_superviseur`. |

### 4.4 Tableau des campagnes existantes

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.4.1 | Colonnes du tableau | Vérifier les en-têtes | 5 colonnes : Nom, Questionnaire, Échéance, Participants, Import CSV | **Screenshot :** en-têtes gris. |
| 4.4.2 | Campagne seed affichée | Vérifier la ligne | « Stingray Town Hall 2026 », nom du quiz, 5 participants | **Screenshot :** ligne avec données du seed. |
| 4.4.3 | Aucune campagne | Base vide (avant seed) | « Aucune campagne. Créez-en une ci-dessous. » | **Screenshot :** cellule centrée avec message. |
| 4.4.4 | Hover sur ligne | Survoler | Surlignage bleu léger | **Screenshot :** fond bleu transparent. |

### 4.5 Import CSV

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.5.1 | Bouton « Importer CSV » sans fichier | Cliquer « Importer CSV » sans sélectionner de fichier | Message rouge « Choisissez un fichier .csv » | **Screenshot :** message d'erreur rouge sous le bouton. |
| 4.5.2 | Import CSV valide | Sélectionner un CSV correct → « Importer CSV » | Message vert « Import terminé — X inscription(s), Y mise(s) à jour. » Page rechargée, compteur participants mis à jour | **Screenshot :** message vert avec compteurs, tableau mis à jour. |
| 4.5.3 | CSV avec doublons | CSV avec 2 lignes même email | 1 inscription + warning « Doublon ignoré… » | **Screenshot :** message vert + message jaune warning « Doublon ignoré… ». |
| 4.5.4 | CSV avec colonnes manquantes | CSV sans colonne email | Erreur ou warnings dans la réponse | **Screenshot :** message d'erreur rouge. |
| 4.5.5 | CSV avec lignes vides | CSV avec des lignes vides intercalées | Lignes vides ignorées, pas d'erreur | **Screenshot :** message vert normal. |
| 4.5.6 | Ré-import même CSV | Importer le même CSV deux fois | 2e import : 0 inscriptions, N mises à jour | **Screenshot :** « 0 inscription(s), N mise(s) à jour ». |
| 4.5.7 | CSV avec en-têtes EN | CSV avec `employee_name,email,supervisor_name,supervisor_email` | Import réussi (le parser reconnaît les en-têtes EN) | **Screenshot :** message vert. |
| 4.5.8 | CSV avec en-têtes FR | CSV avec `nom_employe,courriel,nom_superviseur,courriel_superviseur` | Import réussi | **Screenshot :** message vert. |
| 4.5.9 | CSV avec BOM UTF-8 | CSV encodé avec BOM | Import réussi (option `bom: true`) | **Screenshot :** message vert. |
| 4.5.10 | Fichier > 5 Mo | Sélectionner un gros fichier | Erreur multer (limite dépassée) | **Screenshot :** message d'erreur. |
| 4.5.11 | Erreur réseau pendant import | Couper le serveur → importer | Message « Erreur réseau » | **Screenshot :** message rouge. |
| 4.5.12 | Mise à jour superviseur | Import initial sans superviseur, ré-import avec superviseur rempli | Superviseur mis à jour dans la base | Vérifier dans le dashboard admin. |

### 4.6 Lien retour tableau de bord

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 4.6.1 | Navigation retour | Cliquer « ← Tableau de bord » | Redirigé vers `/admin/dashboard.html?token=changeme` | **Screenshot :** dashboard chargé. |

---

## 5. Tests API isolés

### 5.1 `POST /api/start`

| # | Test | Étapes | Résultat attendu |
|---|------|--------|-------------------|
| 5.1.1 | Code valide | `POST /api/start` avec `{"code":"<VALIDE>"}` | `200` — `user`, `quiz`, `campaign`, `modules` (6), `attempts` |
| 5.1.2 | Code manquant | `POST /api/start` avec `{}` | `400` — `"Code is required"` |
| 5.1.3 | Code invalide | `POST /api/start` avec `{"code":"XXXXXX"}` | `401` — `error: "invalid_code"` |
| 5.1.4 | Deadline remontée | Si la campagne a une deadline | `quiz.deadline` = deadline de la campagne |
| 5.1.5 | Tentatives remontées | Après soumissions | `attempts[]` contient les soumissions précédentes |

### 5.2 `POST /api/submit`

| # | Test | Étapes | Résultat attendu |
|---|------|--------|-------------------|
| 5.2.1 | Soumission valide | `{"code":"...","module_id":1,"score":100,"time_spent_seconds":30}` | `200` — `success: true`, `attempt_number: 1` |
| 5.2.2 | Deuxième tentative | Même module_id, nouveau submit | `attempt_number: 2` (auto-incrémenté) |
| 5.2.3 | Code manquant | Body sans `code` | `400` |
| 5.2.4 | Module manquant | Body sans `module_id` | `400` |
| 5.2.5 | Score manquant | Body sans `score` | `400` |
| 5.2.6 | Code invalide | `{"code":"XXX","module_id":1,"score":50}` | `401` — `invalid_code` |
| 5.2.7 | Module inexistant | `module_id: 9999` | `404` — `invalid_module` |
| 5.2.8 | Module hors campagne | `module_id` d'un autre quiz | `400` — `module_not_in_campaign` |
| 5.2.9 | `time_spent_seconds` par défaut | Body sans `time_spent_seconds` | Stocké comme `0` |

### 5.3 `GET /api/progress/:code`

| # | Test | Étapes | Résultat attendu |
|---|------|--------|-------------------|
| 5.3.1 | Aucune tentative | Code valide, aucun submit | `status: "not_started"`, `completionPercent: 0` |
| 5.3.2 | Partiellement complété | 3/6 modules soumis | `status: "in_progress"`, `completionPercent: 50` |
| 5.3.3 | Entièrement complété | 6/6 modules soumis | `status: "completed"`, `completionPercent: 100` |
| 5.3.4 | Meilleur score par module | 2 tentatives (80, 50) | `best_score: 80` |
| 5.3.5 | `perModule` détaillé | Vérifier la structure | 6 entrées avec `module_id`, `title`, `position`, `completed`, `best_score`, `attempts` |
| 5.3.6 | Code invalide | `GET /api/progress/XXXXX` | `401` — `invalid_code` |
| 5.3.7 | `avgBestScore` | Après plusieurs modules | Moyenne des meilleurs scores par module |
| 5.3.8 | `totalTime` | Après soumissions avec temps | Somme des `time_spent_seconds` |

### 5.4 API Admin

| # | Test | Étapes | Résultat attendu |
|---|------|--------|-------------------|
| 5.4.1 | `GET /admin/api/quizzes` | Avec token | `200` — liste de quizzes avec `module_count` |
| 5.4.2 | `GET /admin/api/campaigns` | Avec token | `200` — campagnes avec `quiz_name`, `participant_count` |
| 5.4.3 | `POST /admin/api/campaigns` | `{"name":"Test","quiz_id":1}` | `200` — `success: true`, `campaign` créée |
| 5.4.4 | `POST /admin/api/campaigns` sans nom | `{"quiz_id":1}` | `400` |
| 5.4.5 | `POST /admin/api/campaigns` quiz inexistant | `{"name":"X","quiz_id":999}` | `404` |
| 5.4.6 | `PUT /admin/api/campaigns/:id/deadline` | `{"deadline":"2026-06-01"}` | `200` |
| 5.4.7 | `PUT /admin/api/campaigns/:id/deadline` — campagne inexistante | ID 999 | `404` |
| 5.4.8 | `GET /admin/api/users` | Avec token | `200` — `users[]`, `campaigns[]` |
| 5.4.9 | `GET /admin/api/users?campaign_id=1` | Filtrage par campagne | Seulement les utilisateurs de cette campagne |
| 5.4.10 | `GET /admin/api/export.csv` | Avec token | `200`, `Content-Type: text/csv`, BOM UTF-8 |
| 5.4.11 | `POST /admin/api/campaigns/:id/import` | Multipart avec fichier CSV | `200` — `rows_in_file`, `users_created`, `enrollments_created`, `warnings` |
| 5.4.12 | Import sans fichier | POST sans field `file` | `400` — `"Missing file (field name: file)"` |
| 5.4.13 | Toutes les routes sans token | Appeler sans `token` | `403` — `"Forbidden — invalid or missing admin token"` |
| 5.4.14 | Toutes les routes avec header `x-admin-token` | Utiliser le header au lieu du query param | `200` — même résultat |

---

## 6. Cas limites et interactions croisées

| # | Test | Étapes | Résultat attendu | Vérification visuelle |
|---|------|--------|-------------------|-----------------------|
| 6.1 | Deux utilisateurs simultanés | Onglet 1 : Alice (code A) complète M1-M6. Onglet 2 : Bob (code B) complète M1-M3. | Chacun voit son propre score et progression. Pas d'interférence. | **Screenshot :** onglet 1 résultats 15/15, onglet 2 au module 4. |
| 6.2 | Recommencer après complétion | Alice complète tout → « Recommencer » → refait le quiz | Nouvelles tentatives (attempt_number +1 pour chaque module) stockées en base | Vérifier `GET /api/progress` : `attempts` > 1 par module. |
| 6.3 | Impact sur le dashboard | Alice fait 2 tentatives → vérifier le dashboard admin | `attempts` affiche le total, `score moy.` reflète le meilleur score | **Screenshot :** ligne Alice avec nombre de tentatives > 6 et score correct. |
| 6.4 | Import CSV puis quiz | Créer campagne → importer CSV → participant ouvre son lien | Le participant voit le quiz normalement avec son nom | **Screenshot :** badge avec le nom importé. |
| 6.5 | Modification deadline visible côté quiz | Admin modifie la deadline d'une campagne → participant fait `POST /api/start` | La nouvelle deadline est retournée dans `quiz.deadline` | Vérifier la réponse JSON. |
| 6.6 | Export CSV après activité | Plusieurs utilisateurs complètent → exporter CSV | CSV contient toutes les lignes avec scores, temps, statuts | Ouvrir le fichier CSV. |
| 6.7 | Quiz en FR puis résultats en EN | Faire le quiz en FR, basculer en EN avant les résultats | Résultats affichés en anglais | **Screenshot :** « Results », « Key Takeaways », « Start Over ». |
| 6.8 | Réseau lent / timeout | Simuler un réseau lent (DevTools) pendant `POST /api/submit` | Le quiz attend la réponse ; pas de soumission dupliquée | Observer le comportement UI (pas de freeze). |
| 6.9 | Navigation directe aux résultats | Manipuler `sessionStorage` pour marquer tous les modules complétés → recharger | Si les modules sont dans `submittedModules`, le comportement dépend de l'implémentation | Observer le résultat. |
| 6.10 | Responsive mobile (320px) | Ouvrir `/quiz?code=...` en viewport 320px | Layout adapté, pas de débordement horizontal, illustrations redimensionnées (`max-width: 100%`) | **Screenshot :** quiz sur mobile — cartes pleine largeur, texte lisible, boutons empilés, images adaptées. |
| 6.11 | Responsive mobile — admin | Ouvrir `/admin/dashboard.html?token=changeme` en viewport 320px | Tableau scrollable horizontalement, pas de cassure | **Screenshot :** tableau dans un conteneur scrollable. |
| 6.12 | Responsive tablette (768px) | Ouvrir les 3 écrans en 768px | Layout intermédiaire correct | **Screenshot :** quiz centré, admin grille adaptée. |
| 6.13 | `prefers-reduced-motion` | Activer la préférence d'accessibilité | Pas d'animations de slide/fade, transitions raccourcies | **Screenshot :** pas de différence visible (vérifier via DevTools que les animations sont `none`). |
| 6.14 | Focus clavier (accessibilité) | Naviguer avec Tab dans le quiz | Focus visible sur les boutons d'options (outline bleu) | **Screenshot :** outline cyan/bleu visible sur un bouton d'option. |
| 6.15 | Score 0/15 | Répondre faux à toutes les questions | Score « 0 / 15 », 0%, message « Des efforts sont nécessaires... » | **Screenshot :** score 0, message de retry. |
| 6.16 | Illustrations chargées dans tous les modules | Parcourir M1 à M6 séquentiellement | Chaque module affiche son image PNG sans broken image, dimensions correctes | **Screenshot :** 6 captures (une par module) montrant l'illustration. |
| 6.17 | Panneau rationale affiché après chaque réponse | Répondre à n'importe quelle question | Panneau « Pourquoi chaque réponse ? » visible avec explications pour toutes les options | **Screenshot :** panneau avec ✓ vert et texte d'explication pour chaque option. |

---

## 7. Matrice de couverture visuelle

Chaque screenshot doit être capturé en **1280×800** (desktop) et **375×812** (mobile iPhone SE) pour les écrans principaux.

### 7.1 Inventaire des états visuels à capturer

| # | Écran | État | Nom fichier screenshot | Desktop | Mobile |
|---|-------|------|------------------------|---------|--------|
| V01 | Quiz | Chargement (spinner) | `quiz-loading` | ✓ | ✓ |
| V02 | Quiz | Erreur — lien invalide | `quiz-error-invalid` | ✓ | ✓ |
| V03 | Quiz | Intro (FR) | `quiz-intro-fr` | ✓ | ✓ |
| V04 | Quiz | Intro (EN) | `quiz-intro-en` | ✓ | ✓ |
| V05 | Quiz | Module 1 — contenu + scénario + image PNG | `quiz-m1-content` | ✓ | ✓ |
| V06 | Quiz | Module 1 — Q1 réponse correcte + rationale | `quiz-m1-q1-correct` | ✓ | — |
| V07 | Quiz | Module 1 — Q1 réponse incorrecte + rationale | `quiz-m1-q1-wrong` | ✓ | — |
| V08 | Quiz | Module 1 — spacer `betweenQuestions` | `quiz-m1-spacer` | ✓ | — |
| V09 | Quiz | Module 1 — Q2 avec rationale | `quiz-m1-q2-rationale` | ✓ | — |
| V10 | Quiz | Module 2 — contenu + illustration | `quiz-m2-content` | ✓ | — |
| V11 | Quiz | Module 3 — contenu + illustration | `quiz-m3-content` | ✓ | — |
| V12 | Quiz | Module 4 — contenu + illustration | `quiz-m4-content` | ✓ | — |
| V13 | Quiz | Module 5 — contenu + illustration | `quiz-m5-content` | ✓ | — |
| V14 | Quiz | Module 6 — Vrai/Faux + illustration | `quiz-m6-vf` | ✓ | — |
| V15 | Quiz | Barre de progression ~50% | `quiz-progress-50` | ✓ | — |
| V16 | Quiz | Barre de progression 100% | `quiz-progress-100` | ✓ | — |
| V17 | Quiz | Résultats — score parfait | `quiz-results-perfect` | ✓ | ✓ |
| V18 | Quiz | Résultats — score partiel | `quiz-results-partial` | ✓ | — |
| V19 | Quiz | Résultats — score faible | `quiz-results-low` | ✓ | — |
| V20 | Quiz | Résultats — récap + messages clés | `quiz-results-recap` | ✓ | ✓ |
| V21 | Quiz | Résultats EN | `quiz-results-en` | ✓ | — |
| V22 | Admin Dashboard | Chargement | `admin-dash-loading` | ✓ | — |
| V23 | Admin Dashboard | Erreur — pas de token | `admin-dash-no-token` | ✓ | — |
| V24 | Admin Dashboard | Erreur — token invalide | `admin-dash-bad-token` | ✓ | — |
| V25 | Admin Dashboard | Vue complète avec données | `admin-dash-full` | ✓ | ✓ |
| V26 | Admin Dashboard | Filtre Terminé | `admin-dash-filter-completed` | ✓ | — |
| V27 | Admin Dashboard | Filtre Pas commencé | `admin-dash-filter-notstarted` | ✓ | — |
| V28 | Admin Dashboard | Filtre 0 résultat | `admin-dash-filter-empty` | ✓ | — |
| V29 | Admin Dashboard | Deadline modifiée — « Enregistré. » | `admin-dash-deadline-saved` | ✓ | — |
| V30 | Admin Campagnes | Vue complète | `admin-camp-full` | ✓ | ✓ |
| V31 | Admin Campagnes | Erreur — pas de token | `admin-camp-no-token` | ✓ | — |
| V32 | Admin Campagnes | Formulaire rempli | `admin-camp-form-filled` | ✓ | — |
| V33 | Admin Campagnes | Campagne créée — succès | `admin-camp-created` | ✓ | — |
| V34 | Admin Campagnes | Import CSV — succès | `admin-camp-import-ok` | ✓ | — |
| V35 | Admin Campagnes | Import CSV — warning doublon | `admin-camp-import-warn` | ✓ | — |
| V36 | Admin Campagnes | Import CSV — erreur pas de fichier | `admin-camp-import-nofile` | ✓ | — |
| V37 | Admin Campagnes | Format CSV attendu (aide) | `admin-camp-csv-help` | ✓ | — |

### 7.2 Critères d'évaluation visuelle

Pour chaque screenshot, vérifier :

| Critère | Description | Poids |
|---------|-------------|-------|
| **Intégrité du layout** | Pas de débordement, éléments alignés, pas de chevauchement | Critique |
| **Lisibilité du texte** | Contraste suffisant (WCAG AA minimum), taille > 12px effective | Critique |
| **Cohérence des couleurs** | Respect des variables CSS / palette du thème (`:root` ou équivalent) : fond, accent, états correct/incorrect | Important |
| **Typographie** | Police « Outfit » chargée (quiz) / system-ui (admin), graisses correctes | Important |
| **États interactifs** | Hover, focus, disabled visibles et distincts | Important |
| **Animations** | Transitions fluides (fade-in, slide), pas de saccade | Mineur |
| **Badges de statut** | Couleurs correctes : vert (Terminé), jaune (En cours), rouge (Pas commencé) | Important |
| **Responsive** | Pas de scroll horizontal involontaire, touch targets ≥ 44px | Critique |
| **Images** | Toutes les illustrations du parcours chargées, pas de broken image ; style cohérent avec le thème (couleurs du design system actuel) | Important |
| **Panneau rationale (`explain_opts`)** | Visible après chaque réponse, ✓/✗ correctement colorés, texte lisible | Important |
| **Formulaires** | Labels visibles, placeholder lisible, focus border bleu | Important |

---

## 8. Test UX automatisé — parcours participant (quiz seul)

**Script principal :** `quiz-platform/scripts/ux-e2e-quiz-user-journey.js`  
**Alias :** `integration-e2e-quiz-generic.js` relaie vers ce script (compatibilité).

**Exécution :** depuis `quiz-platform`, serveur démarré, base seedée —

```bash
QUIZ_CODE=<code depuis npm run seed ou campaign_users> node scripts/ux-e2e-quiz-user-journey.js
# ou : npm run test:ux:quiz
```

`QUIZ_CODE` peut être remplacé par `CLAIRE_CODE` pour alignement avec d’autres scripts.

**Voir le parcours comme un utilisateur :** `UX_HEADLESS=0` ouvre une fenêtre Chromium ; `UX_SLOW_MS=40` ralentit les gestes ; `UX_VIEWPORT=1280x800` fixe la taille ; `UX_SCREENSHOT_DIR=./tmp/ux-shots` enregistre une capture aux résultats (ou état d’échec).

### 8.1 Comportement « comme un utilisateur »

| Objectif | Comportement du test | Complément manuel / § |
|------------|------------------------|------------------------|
| **Écran utilisable** | Zone `#main` dimensionnée, pas de débordement horizontal sur `body` ; bouton d’intro **visible** dans le viewport | Mobile §6.10–6.12 |
| **Rendu soigné** | `document.fonts.ready` ; pas de jugement esthétique complet sans humain | §7.2 |
| **Images** | Chaque `<img>` dans `#main` est décodée (`naturalWidth > 0`) — ce que voit l’utilisateur | §1.6 |
| **Liens** | S’il existe un lien same-origin **visible** dans `.app`, scroll + **clic** (puis retour au quiz si navigation) ; sinon skip documenté | Liens externes / mail : exclus |
| **Parcours début → fin (A→Z)** | Intro puis enchaînement **de toutes les étapes** (pages de contenu, questions, interstitiels) via `goNext()` comme l’app ; chaque question : **bonne réponse** via `selectAnswer` ; après réponse : feedback + rationale ; images vérifiées **par module** | Erreurs volontaires §2.8 ; i18n §2.2 |
| **Résultats + serveur** | Score parfait = nombre total de questions (`countTotal`) ; blocs par module dans les résultats ; **`GET /api/progress`** : `status: completed`, `completionPercent: 100`, tous les modules `completed` | — |

### 8.2 Ce que ce test ne remplace pas

- **§2.8 / §2.9** — chemins avec mauvaises réponses et matrice d’erreurs.
- **§2.7 / §5** — observation réseau ou contrats API (`curl`).
- **Admin** — `integration-e2e-smoke.js` ou parcours §3–§4.
- **Liens externes** — pas de clic sortant vers d’autres domaines.

### 8.3 Sortie

- JSON sur stdout : `kind: "ux-user-journey"`, assertions `results.pass` / `fail`, et **`productFeedback`** : `findings[]` (severity `bug` | `improvement` | `note`, area, title, detail, suggestedAction), `markdownReport` (collage ticket/Notion), `counts`.
- **stderr** : bloc texte **PRODUCT FEEDBACK** lisible pour PM / dev.
- `UX_REPORT_PATH=./tmp/ux-feedback.md` : export Markdown du rapport.

Code de sortie `0` si aucune assertion en échec.

---

## Résumé de couverture

| Section | Nombre de tests | Écrans couverts |
|---------|----------------|-----------------|
| 0. Principes génériques | — | Cadre pour agents (motifs A–J), indépendant du contenu |
| 1. Prérequis | 6 | — |
| 2. Quiz — Participant | **92** | `quiz.html` (intro, modules avec illustrations + rationale, résultats, erreur) — inclut **§2.0** (navigation), **§2.8** (3 parcours E2E obligatoires), **§2.9** (matrice erreurs) + cas détaillés §2.1–2.7 |
| 3. Admin Dashboard | 26 | `dashboard.html` |
| 4. Admin Campagnes | 22 | `campaigns.html` |
| 5. API isolés | 32 | Tous les endpoints |
| 6. Cas limites | 17 | Interactions croisées, responsive, accessibilité, illustrations, rationale |
| 7. Matrice visuelle | 37 screenshots | Tous les états de tous les écrans |
| 8. Quiz — test UX (script) | ~10 critères `ux-*` | `quiz.html` — clics utilisateur, feedback, layout, images, liens visibles |
| **TOTAL** | **232+ vérifications** + **§8** | **3 écrans + API + responsive + parcours navigation / erreurs** |

### Chemins utilisateur couverts

```
Participant :
  ├─ Code valide
  │   ├─ FR
  │   │   ├─ Parcours navigation §2.0 (N1→N8) : intro → modules 1→…→n → résultats (référence E2E « comme un utilisateur ») ; variante automatisée §8
  │   │   ├─ Chaque module : illustration PNG visible + contenu pédagogique
  │   │   ├─ Chaque question : feedback + panneau rationale (explain_opts) avec ✓/✗
  │   │   ├─ Module 1 : betweenQuestions (signaux d'alerte entre Q1 et Q2)
  │   │   ├─ Intro → Commencer → M1 → M2 → M3 → M4 → M5 → M6 → Résultats (score parfait) — parcours 2.8.1
  │   │   ├─ Intro → … → Résultats (score partiel, au moins une erreur par module) — parcours 2.8.2 + §2.9
  │   │   ├─ Intro → … → Résultats (score nul ou quasi) — parcours 2.8.3 / §6.15
  │   │   ├─ Pour chaque module : tester au moins une réponse incorrecte (feedback rouge, rationale) — §2.3.x + §2.9
  │   │   ├─ Module X → Précédent → Module X-1 (navigation arrière)
  │   │   ├─ Module X → Refresh → Module X restauré (persistance)
  │   │   └─ Résultats → Recommencer → Intro (nouveau cycle)
  │   └─ EN
  │       └─ (mêmes chemins en anglais, mêmes illustrations)
  ├─ Code invalide → Erreur
  ├─ Code manquant → Erreur
  └─ Basculer FR ↔ EN à tout moment

Admin :
  ├─ Dashboard
  │   ├─ Token valide
  │   │   ├─ Vue globale → filtrer Terminé / En cours / Pas commencé / Tous
  │   │   ├─ Sélectionner campagne → données filtrées → modifier deadline → « Enregistré »
  │   │   ├─ Export CSV (global) / Export CSV (par campagne)
  │   │   └─ Actualiser
  │   ├─ Token manquant → Erreur
  │   └─ Token invalide → Erreur
  └─ Campagnes
      ├─ Token valide
      │   ├─ Créer campagne (nom + quiz + deadline optionnelle) → succès
      │   ├─ Créer campagne — validation (champs requis)
      │   ├─ Importer CSV → succès / warnings / erreur
      │   └─ Retour au tableau de bord
      ├─ Token manquant → Erreur
      └─ Token invalide → Erreur
```
