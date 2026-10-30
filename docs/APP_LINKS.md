# SA Invoice Pro — all links

**Product email:** sainvoicepro@gmail.com only  
Do **not** use pcrepairdex@gmail.com or nadiagcloete@gmail.com for this product.

**App version tip:** 6.38.0+

---

## Developer (you)

| Resource | URL |
|----------|-----|
| Desk repo | https://github.com/dexter187gold/sa-invoice-pro |
| Sync repo | https://github.com/dexter187gold/saip-sync |
| Website repo | https://github.com/dexter187gold/sa-invoice-pro-website |
| Client portal repo | https://github.com/dexter187gold/sa-invoice-pro-client-portal |
| GitHub Actions | https://github.com/dexter187gold/sa-invoice-pro/actions |
| **In-app Dev portal** | `{desk}/dev-portal` |
| Owner command centre | `{desk}/owner-console` |
| Owner recovery | `{desk}/owner-recovery` |
| Portal admin | `{desk}/portal-admin` |
| License admin | https://sa-invoice-license.onrender.com/admin |
| License dashboard | https://sa-invoice-license.onrender.com/ |
| Sync API | https://saip-sync.onrender.com |
| Sync health | https://saip-sync.onrender.com/health |
| Updates server | https://sa-invoice-updates.onrender.com |
| Render dashboard | https://dashboard.render.com/ |

`{desk}` = your Cloudflare Pages / Workers hostname for the built SPA.

### Secrets & env (Render only)

| Service | Typical env |
|---------|-------------|
| saip-sync | `JWT_SECRET`, git-store credentials |
| sa-invoice-license | PayFast merchant id/key/passphrase, admin token, Google client id |
| sa-invoice-updates | update token |

Configure **public** URL overrides in-app: **Dev portal** (`/dev-portal`). Never paste secrets into the browser.

---

## App users (shop / desk)

| Resource | URL |
|----------|-----|
| Desk app | Your Cloudflare Pages URL (from deploy) |
| Sign in | `{desk}/login` |
| Home | `{desk}/` |
| License activation | `{desk}/license` |
| Settings / backup | `{desk}/settings` |
| Sync health UI | `{desk}/sync` |
| Support | `{desk}/support` |
| Roadmap (in-app) | `{desk}/roadmap` |

---

## End customers (clients of the shop)

| Resource | URL |
|----------|-----|
| Token portal | `{desk}/portal/:token` |
| Portal sections | `.../quotes` · `.../invoices` · `.../payments` · `.../service` |
| Standalone client portal | https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev |

Portal links are generated from **Clients** in the desk (token or PIN flow).

---

## API surface (operators)

### saip-sync
- `GET /health`
- `POST /api/auth/register` · `POST /api/auth/login`
- `GET /api/portal/view/:token` · `POST /api/portal/quote-decision`

### License
- `POST /api/handshake` · `POST /api/activate` · `GET /api/public-config`
