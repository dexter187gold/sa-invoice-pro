# SA Invoice Pro — all links

**Product email:** sainvoicepro@gmail.com only  
**App version tip:** 6.38.1+

---

## Developer portal (restricted)

| | |
|--|--|
| **URL** | `{desk}/dev-portal` |
| **Access** | Separate login — not the shop staff login |
| **Username** | Your developer account (configured in app) |
| **Session** | 12 hours in the browser tab |

Staff using the normal desk login **cannot** open the vault without the developer password.

Inside the portal you can store (on **this browser only**):
- PayFast merchant id / key / passphrase
- JWT secret, license admin token
- Meta / WhatsApp tokens
- Google OAuth client id/secret
- Render API key, update token, git-store token

Use **Copy env snippet** → paste into **Render → Environment**. The vault does not push secrets to Render by itself.

---

## Developer services

| Resource | URL |
|----------|-----|
| Desk repo | https://github.com/dexter187gold/sa-invoice-pro |
| Sync repo | https://github.com/dexter187gold/saip-sync |
| Actions | https://github.com/dexter187gold/sa-invoice-pro/actions |
| License admin | https://sa-invoice-license.onrender.com/admin |
| Sync health | https://saip-sync.onrender.com/health |
| Updates | https://sa-invoice-updates.onrender.com |
| Render | https://dashboard.render.com/ |

---

## App users (shop)

`{desk}/login` · `{desk}/` · `{desk}/license` · `{desk}/settings`

## Clients

`{desk}/portal/:token` · https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev
