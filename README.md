# @jeb-maker/reports

Plugin JavaScript **vanilla** de signalement utilisateur (bug, aide, suggestion, question). Intégrable via npm ou `<script>`. Capture un contexte diagnostic riche et envoie via un adaptateur configurable.

**Projet 100 % JS** — pas de backend dans ce dépôt. L’auth est à la charge de l’application hôte.

## Installation

```bash
npm install @jeb-maker/reports
```

```js
import { Reports } from '@jeb-maker/reports';
// ou: import Reports from '@jeb-maker/reports';

Reports.init({
  adapter: 'webhook',
  webhook: {
    url: '/api/feedback',
    credentials: 'same-origin', // cookies same-origin ; 'include' seulement si vous le voulez explicitement
  },
  metadata: () => ({ userId: window.currentUser?.id, appVersion: '1.2.0' }),
});
```

Script tag (après `npm run build`) :

```html
<script src="./dist/reports.min.js"></script>
<script>
  Reports.init({ adapter: 'webhook', webhook: { url: '/api/feedback' } });
</script>
```

## API

| Méthode | Rôle |
|---------|------|
| `Reports.init(config)` | Monte le widget |
| `Reports.open()` / `close()` | Ouvre / ferme le formulaire |
| `Reports.connect()` | OAuth PKCE (si `auth: 'oauth'`) **ou** appelle `getAccessToken()` s’il est fourni |
| `Reports.logout()` | Efface le token mémoire |
| `Reports.destroy({ clearAuth? })` | Démonte ; n’efface le token que si `clearAuth: true` |
| `Reports.submit(payload)` | Envoi programmatique — objet `{ type, title, message, email?, consentScreenshot? }` (pas un `<form>`) |

## Auth (trackers)

| Mode | Usage |
|------|--------|
| `auth: 'url'` | `POST` vers **votre** app (`credentials` défaut `same-origin`). Ne forward **pas** le Bearer tracker sauf `forwardBearer: true`. |
| `auth: 'token'` | API tracker directe via `getAccessToken()` (runtime, jamais de string figée). |
| `auth: 'oauth'` | PKCE navigateur : **Jira Data Center**, **GitLab**. Pas GitHub (secret requis). Pas Jira Cloud sans échange côté app. |

La lib **refuse** `clientSecret` / PAT hardcodés dans `init()`. Tokens OAuth en **mémoire uniquement** (pas de `refresh_token` persisté).

### Jira Cloud (login user → token user)

Oui via OAuth 3LO. L’échange `code→token` nécessite le `client_secret` **côté app hôte**, puis :

```js
Reports.init({
  adapter: 'jira',
  jira: {
    auth: 'token',
    cloudId: 'YOUR_CLOUD_ID',
    getAccessToken: () => myApp.getJiraAccessToken(),
    projectKey: 'SUP',
  },
});
```

Ou `auth: 'url'` vers `/api/feedback/jira`.

### Jira Data Center (PKCE)

```js
Reports.init({
  adapter: 'jira',
  jira: {
    auth: 'oauth',
    variant: 'datacenter',
    baseUrl: 'https://jira.example.tld',
    clientId: '…',
    redirectUri: 'https://app.example/oauth/callback.html', // examples/oauth-callback.html
    projectKey: 'SUP',
  },
});
```

## Adaptateurs

`webhook` · `slack` · `github` · `jira` · `redmine` · `gitlab` · `linear` · `azureDevOps` · `function`

- **Slack** : texte/blocks seulement (pas d’image base64).
- **Redmine** : header `X-Redmine-API-Key` (`authScheme: 'redmine'`).
- **Azure DevOps PAT** : `usePat: true` → Basic auth.
- **Linear API key** : `useApiKey: true` → `Authorization` sans Bearer.
- **Screenshot** : `getDisplayMedia` ; html2canvas seulement si vous fournissez `screenshot.html2canvas` ou `window.html2canvas` (pas de CDN tiers).

## Rapport (`schemaVersion: 1`)

Page (URL redactée), navigateur, viewport, timing, console, erreurs, réseau (échecs), screenshot, metadata, `actions: []` (réservé post-V1).

## CORS

Si l’API tracker bloque le navigateur → `auth: 'url'` same-origin. Jira Cloud : CORS OK sur `api.atlassian.com` avec Bearer.

## Démo

```bash
npm install
npm run demo
```

## Checklist

1. Pas de secret dans le JS public  
2. Sécuriser l’endpoint de réception (auth, rate-limit)  
3. OAuth app + `redirectUri` same-origin si besoin  
4. `metadata()` pour userId / version  
5. Tester screenshot + consentement  

## Post-V1

Suite d’actions · wrappers React / Vue / Angular / Svelte / Web Component

## Licence

MIT
