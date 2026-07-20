# Changelog

## 0.3.0 — 2026-07-20

### Nouveautés
- **Envoi automatique des erreurs JS (opt-in)** : `autoReport: { errors: true }` dans `init()` envoie un rapport complet à chaque erreur non interceptée (`error` / `unhandledrejection`). Garde-fous : déduplication par signature, cooldown (30 s par défaut), plafond par session (5 par défaut), jamais de screenshot, aucune boucle possible si l'adapter échoue.
- Les rapports portent un champ `trigger` : `'manual'` ou `'auto:error'`.

### Corrections
- **La modal de signalement ne pouvait pas être fermée ni annulée** : la règle `.rp-backdrop { display: flex }` écrasait la règle UA `[hidden] { display: none }`. Règle explicite ajoutée.
- `base64UrlEncode` (PKCE) utilisait `instanceof ArrayBuffer`, qui échoue sur les typed arrays et les buffers cross-realm. Remplacé par `ArrayBuffer.isView`.
- `redactUrl` ne nettoyait que les paramètres query/hash ; une seconde passe de redaction couvre désormais toute l'URL.

### Qualité
- Suite de 156 tests unitaires (Vitest + jsdom) couvrant core, adapters, collecteurs, OAuth/PKCE, transport, UI.
- ESLint 9 (flat config) et workflow CI (lint + tests + build sur chaque push / PR).
- `prepublishOnly` exécute désormais lint + tests + build.

## 0.2.0

- Imports tree-shakeable : entrée `./core` + sous-chemins par adapter (`./adapters/*`).

## 0.1.0

- Version initiale : widget de signalement vanilla JS, capture de contexte (console, erreurs, réseau, screenshot), 8 adapters (webhook, Slack, GitHub, Jira, Redmine, GitLab, Linear, Azure DevOps), OAuth PKCE (Jira Data Center, GitLab), redaction des secrets.
