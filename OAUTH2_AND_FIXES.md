# SA Invoice Pro – OAuth2 + Key Fix Snippets (v1.3)

## OAuth2 Google Sign-In

1. Google Cloud Console → create **OAuth client ID** (Web)
2. Authorized origins: `http://127.0.0.1:8080`, your public HTTPS URL
3. In app: **Settings → About → Google OAuth2 Client ID** → Save
4. Login screen → **Continue with Google (OAuth2)**

### Core flow (already in `js/auth.js`)

```js
const client = google.accounts.oauth2.initTokenClient({
  client_id: clientId,
  scope: 'openid email profile',
  callback: async (tokenResponse) => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenResponse.access_token }
    });
    const profile = await res.json();
    // Map profile.sub / email → local IndexedDB user + persist session
  }
});
client.requestAccessToken();
```

Requires: `<script src="https://accounts.google.com/gsi/client" async defer></script>`

Local password auth still works fully offline. Google needs network once.

---

## Fix: Skip Welcome after company exists

```js
if (this.company && this.company.name && this.company.name.trim()) {
  if (!this.onboardingDone) {
    await DB.setSetting('onboardingDone', true);
    this.onboardingDone = true;
  }
}
// then navigate home / last page – never showOnboarding()
```

## Fix: Persistent login

```js
localStorage.setItem('sa_session_v12', JSON.stringify(user));
// on init: read localStorage first (survives browser restart)
```

## Fix: Stay on same page after refresh

```js
localStorage.setItem('sa_current_page', page);
// on login success:
const last = localStorage.getItem('sa_current_page') || 'home';
this.navigate(last);
```

## Fix: License key generation (4+4 segments)

```js
let p1 = chunk(); // 4 chars
p1 = planCode + p1.slice(1);
const p2 = chunk(); // 4 chars
const check = checksum(p1 + p2);
return `SAIP-${p1}-${p2}-${check}`;
```

## Fix: Ticket → resolved + invoice

```js
t.status = 'resolved';
await DB.put(DB.STORES.tickets, t);
const invId = await DB.add(DB.STORES.invoices, inv);
this.showDocModal('invoice', invId);
```

---

## Low-code document automation (research summary)

| Tool | Best for | Notes |
|------|----------|--------|
| **PandaDoc** | Quotes, proposals, e-sign | Sales-friendly, CRM |
| **Conga** | Salesforce-heavy shops | Enterprise compose |
| **Formstack Documents** | No-code merge templates | Many integrations |
| **HotDocs** | SME template logic | Strong for legal-ish packs |
| **DocuSign CLM** | Contracts + sign | Enterprise cost |
| **Anvil** | API-first PDF/workflows | Dev product teams |
| **SA Invoice Pro (built-in)** | Offline SA invoices + letters | No SaaS fee; ZAR/VAT/SLA letters |

**Recommendation for this product:** keep the built-in generator for offline SA use; optionally export later to PandaDoc/DocuSign only if customers need e-sign cloud workflows.
