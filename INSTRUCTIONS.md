# SA Invoice Pro — Grok workspace instructions

**Product email (primary for this product):** `sainvoicepro@gmail.com`  
**Do not use for SAIP product ops:** `pcrepairdex@gmail.com`, `nadiagcloete@gmail.com` (reserved for other work).

**Repo:** https://github.com/dexter187gold/sa-invoice-pro  
**Owner GitHub:** dexter187gold  
**Sync server:** https://saip-sync.onrender.com  
**License server:** https://sa-invoice-license.onrender.com  
**Frontend:** Cloudflare Pages / Workers (static Vite `dist/`)  

---

## What this product is

**SA Invoice Pro** is the operating system for **Southern African IT / mobile repair / MSP benches** — not a generic Xero clone.

North stars:
1. Bench-native (FRP, IMEI, COD vs remote vs on-site)
2. WhatsApp-first collections and job updates
3. Offline-first IndexedDB; cloud is restore, not a spinner wall
4. License + white-label path for other IT shops
5. POPIA-aware defaults
6. Pulse desk: cash + SLA + collection ring in one glance
7. SA tax habits: VAT 15%, quote→invoice, proforma culture

---

## How the owner works with Grok

- Speak in **mega execution slices**: fix build → ship features → bump version → update `ROADMAP_STATUS.md`.
- Prefer **push to `main`** on `dexter187gold/sa-invoice-pro` via GitHub tools.
- Always keep **version aligned**: `package.json`, `src/config.js` (`APP_VERSION`), `version.json`, `README.md` title, latest `CHANGELOG.md` heading — or `npm run build` fails `check-version.mjs`.
- Always satisfy **`scripts/check-exports.mjs`**: every named import must be exported from the target module.
- Stack: React 19, Vite 6, jsPDF, pdfjs, xlsx, Playwright. **No** heavy new dependencies without reason.
- UI tone: ZA English, field-tech, WhatsApp-friendly messages with `*bold*` for WA.

---

## Portal / sync server (6.23+)

SPA calls:
- `GET {sync}/api/portal/view/:token`
- `POST {sync}/api/portal/quote-decision`

Reference implementation lives in **`server/`** (`portal-store.js` + `routes/portal.js`).  
Deploy those routes onto **saip-sync** Render (or point `SA_CONFIG.syncServerUrl` at this API) so production write-back works.

Offline: SPA queues decisions in `localStorage` (`saip_portal_decisions_v1`); Quotes → **Apply queue**.

---

## Slice workflow (always)

1. Read current `package.json` version + `ROADMAP_STATUS.md`.
2. Diagnose build failures from logs (export-check / version-check first).
3. Implement libs under `src/lib/*`, wire UI in `src/pages/*`.
4. Bump version everywhere listed above.
5. Update `CHANGELOG.md` + `ROADMAP_STATUS.md`.
6. Push commit to `main` with clear message: `feat(x.y.z): …`.
7. Report % by phase honestly; list remaining gaps.

---

## Secrets / accounts (owner-held)

- Cloudflare API token + account id (GitHub Actions secrets)
- Render: saip-sync + license server env (`DATA_DIR` for portal-store)
- Google OAuth client for production login (if enabled)
- Product mailbox: **sainvoicepro@gmail.com**

Grok does not store passwords; ask owner to set secrets in host dashboards.

---

*Last updated with release 6.23.0 — portal server write-back + auth e2e harness.*
