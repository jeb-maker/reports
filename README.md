# @jeb-maker/reports

Plugin JavaScript **vanilla** de signalement utilisateur (bug, aide, suggestion, question). Intégrable sur n’importe quel site via `<script>` ou npm. Capture un contexte diagnostic riche et envoie le rapport via un adaptateur configurable.

**Projet 100 % JS** — pas de backend ni de proxy dans ce dépôt. L’authentification est à la charge de l’application hôte.

## Installation

```bash
npm install @jeb-maker/reports
```

Ou script tag après build :

```html
<script src="./dist/reports.min.js"></script>
<script>
  Reports.init({ /* config */ });
</script>
```

## Démarrage rapide

```js
import Reports from '@jeb-maker/reports';

Reports.init({
  adapter: 'webhook',
  webhook: {
    url: '/api/feedback',
    credentials: 'include', // session cookie de votre app
  },
  metadata: () => ({ userId: window.currentUser?.id, appVersion: '1.2.0' }),
});
```

API : `Reports.open()` · `Reports.close()` · `Reports.connect()` · `Reports.logout()` · `Reports.destroy()` · `Reports.submit(form)`.

## Chemins d’auth (trackers)

| Mode | Usage |
|------|--------|
| `auth: 'url'` | `POST` vers une URL de **votre** app (recommandé). Sécurisez avec cookie session / JWT. |
| `auth: 'token'` | Appels API tracker directs avec `getAccessToken()` (token **utilisateur** runtime — jamais de string figée). |
| `auth: 'oauth'` | PKCE navigateur quand le tracker le permet (ex. **Jira Data Center**, GitLab). |

La lib **refuse** `clientSecret` / PAT hardcodés dans `init()`.

### Jira Cloud (login utilisateur → token utilisateur)

Oui : OAuth 3LO donne un token **au nom de l’utilisateur**.  
Non : échange `code → token` sans `client_secret` (pas de PKCE public Cloud).

```js
// L’app hôte échange le code (secret serveur), puis :
Reports.init({
  adapter: 'jira',
  jira: {
    auth: 'token',
    cloudId: 'YOUR_CLOUD_ID',
    getAccessToken: () => myApp.getJiraAccessToken(),
    projectKey: 'SUP',
    issueType: 'Bug',
  },
});
```

Ou forward via votre API :

```js
Reports.init({
  adapter: 'jira',
  jira: {
    auth: 'url',
    url: '/api/feedback/jira',
    credentials: 'include',
    projectKey: 'SUP',
  },
});
```

### Jira Data Center (PKCE navigateur)

```js
Reports.init({
  adapter: 'jira',
  jira: {
    auth: 'oauth',
    variant: 'datacenter',
    baseUrl: 'https://jira.example.tld',
    clientId: '…',
    redirectUri: 'https://app.example/oauth/callback.html', // voir examples/oauth-callback.html
    projectKey: 'SUP',
  },
});
```

## Adaptateurs

| Id | Rôle |
|----|------|
| `webhook` | POST JSON du rapport brut |
| `slack` | Incoming webhook — résumé texte/blocks (**pas** d’image base64) |
| `github` | Issue GitHub (token ou url) |
| `jira` | Issue Jira Cloud / DC |
| `redmine` | Issue Redmine |
| `gitlab` | Issue GitLab |
| `linear` | Issue Linear (GraphQL) |
| `azureDevOps` | Work item Azure DevOps |
| `function` | `(report) => Promise` |

Exemple Slack :

```js
Reports.init({
  adapter: 'slack',
  slack: { webhookUrl: 'https://hooks.slack.com/services/…' },
});
```

Exemple callback custom :

```js
Reports.init({
  adapter: async (report) => {
    await myApi.send(report);
  },
});
```

## Contenu du rapport (`schemaVersion: 1`)

- Identité : `id`, `createdAt`, `type`, `title`, `message`, `email?`
- Page / navigateur / viewport / timing
- `console[]` (redacté), `errors[]`, `network[]` (échecs seulement, sans headers secrets)
- `screenshot: { status, mime?, dataUrl?, bytes?, method? }` — `getDisplayMedia` puis fallback html2canvas ; consentement UI
- `metadata`, `actions: []` (réservé post-V1)

Pas de cookies / localStorage automatiques.

## CORS

Si l’API du tracker bloque le navigateur, utilisez `auth: 'url'` vers **votre** endpoint same-origin. Jira Cloud autorise CORS sur `api.atlassian.com` **avec** un Bearer.

## Démo locale

```bash
npm install
npm run demo
# ou
npm run build
```

## Checklist intégrateur

1. Ne jamais mettre `clientSecret` / PAT orga dans le JS public  
2. Sécuriser l’URL de réception (auth session, rate-limit)  
3. Enregistrer l’app OAuth chez le tracker si besoin + `redirectUri`  
4. Fournir `metadata()` (userId, version, tenant…)  
5. Tester le consentement screenshot sur mobile / desktop  

## Post-V1 (prévu)

- Suite d’actions (breadcrumb clics / navigation)  
- Wrappers frameworks (React, Vue, Angular, Svelte, Web Component)  

## Licence

MIT
