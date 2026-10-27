# SA Invoice Pro — production links

**Product email:** sainvoicepro@gmail.com  
**Tip version:** 6.30.0+

Do **not** use pcrepairdex@gmail.com or nadiagcloete@gmail.com for this product.

---

## Live services (Render)

| App | URL | Notes |
|-----|-----|--------|
| **License server** (dashboard) | https://sa-invoice-license.onrender.com/ | Issue keys, approve requests |
| **License admin portal** | https://sa-invoice-license.onrender.com/admin | Google Client ID + PayFast push |
| **Updates server** | https://sa-invoice-updates.onrender.com | Desktop/update channel (may cold-start on free tier) |
| **Sync / cloud API** (saip-sync) | https://saip-sync.onrender.com | Auth, workspace sync, portal write-back |
| **Sync health** | https://saip-sync.onrender.com/health | JSON health |
| **said** (related) | https://said-3sap.onrender.com | Separate `said` service |

### License API (client uses these)

- `POST /api/handshake`
- `POST /api/request-license` · `/api/license/request`
- `POST /api/activate` · `/api/license/activate`
- `GET /api/public-config`

### Portal API (via saip-sync)

- `GET /api/portal/view/:token`
- `POST /api/portal/quote-decision`
- Native: `GET /api/portal/:token`

---

## Frontend (desk app)

| App | URL | Notes |
|-----|-----|--------|
| **SA Invoice Pro desk** | *Your Cloudflare Pages project* | Build `npm run build` → `dist` from `main` |
| **Client portal** | `{PagesHost}/portal/:token` | Multi-page: Overview, Quotes, Invoices, Payments, Service |
| **In-app License** | `{PagesHost}/license` | Handshake · request · activate |

Set the exact Pages hostname in Cloudflare (or GitHub Pages). Grok cannot read your CF dashboard; paste the URL into Settings → Cloud if needed.

---

## Repos

| Repo | URL |
|------|-----|
| Desk SPA + license_server.py | https://github.com/dexter187gold/sa-invoice-pro |
| Sync server | https://github.com/dexter187gold/saip-sync |

---

## Operator flow (license)

1. Desk → **License** → Handshake → Request  
2. Open **License dashboard** → approve / issue key  
3. Desk → **Activate on server**  
4. Soft alpha never hard-locks the desk for 30 days (+ after)
