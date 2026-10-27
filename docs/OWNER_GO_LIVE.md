# Owner go-live checklist — SA Invoice Pro

**Product email:** sainvoicepro@gmail.com  
**Repo tip:** main @ 6.24.0+  
Grok **cannot** log into your Cloudflare / Render / Google consoles. These steps are yours.

---

## A. Must do for production portal Accept/Decline (critical)

Live **saip-sync.onrender.com** currently answers `Cannot POST /api/portal/quote-decision` and `Cannot GET /api/portal/view/:token`. Code in this repo’s `server/` folder implements those routes.

### Option 1 — Merge portal routes into existing saip-sync (preferred)

1. Open the **saip-sync** Render service (or its Git repo if separate).
2. Copy from this repo:
   - `server/src/portal-store.js`
   - `server/src/routes/portal.js`
3. Mount router like:
   ```js
   app.use('/api/portal', portalRouter)
   ```
4. On Render: enable **persistent disk**, set `DATA_DIR` to that path (e.g. `/var/data`).
5. Optional env: `PORTAL_PUBLIC_URL=https://YOUR-PAGES-HOST` (full portal URLs).
6. Deploy → test:
   ```bash
   curl -s https://saip-sync.onrender.com/api/portal/view/test
   # expect JSON 404 "invalid", not HTML "Cannot GET"
   ```

### Option 2 — Deploy `server/` as its own Render Web Service

1. New Web Service from `dexter187gold/sa-invoice-pro`, root **`server`**, start `npm start`.
2. Persistent disk + `DATA_DIR`.
3. In the SPA, point sync at that host **only if** it also hosts auth/workspace — otherwise keep saip-sync for auth and merge Option 1.

Until this is done: clients can still Accept offline; shop uses **Quotes → Apply queue**.

---

## B. Frontend (Cloudflare Pages)

1. Confirm Pages project builds from `main` of `sa-invoice-pro`.
2. Build command: `npm run build` · output: `dist`.
3. After each push, wait for green deploy (or **Retry deployment** on tip).
4. Secrets if used: none required for static SPA; OAuth is server-side.

---

## C. License server (optional paid tiers)

1. Render service for `license_server.py` / existing license host.
2. Env: admin keys, DB/path as you already run.
3. SPA default: `https://sa-invoice-license.onrender.com` in `src/config.js`.

---

## D. Google sign-in (optional)

1. Google Cloud Console OAuth client (Web).
2. Authorized redirect: `https://saip-sync.onrender.com/api/auth/google/callback` (or your sync host).
3. Set `GOOGLE_CLIENT_ID` (+ secret) on **saip-sync**.
4. SPA already probes `/api/auth/google/status`.

---

## E. Cloudflare / GitHub Actions (APK / Workers)

1. GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` if Workers workflow used.
2. APK workflow: follow `docs/BUILD_APK_GITHUB.md` when you need a store build.

---

## F. Bench operator checklist (day-one shop)

1. Create account / sign in · complete **Setup** (company name, VAT, bank).
2. Settings → Cloud: sign in, **Sync Now** once.
3. Settings → White-label: logo + accent → Apply (PDF + shell).
4. Install IT pack on Products if needed.
5. Add client → portal link → WhatsApp to customer.
6. Quotes: after client decides, **Pull cloud decisions** or **Apply queue**.
7. Convert accepted quote → invoice → PDF.

---

## G. What “100%” means (honest)

| Layer | Status |
|-------|--------|
| Sellable desk app (local/offline) | ~97–98% in repo |
| Live portal write-back on Render | **Blocked on your deploy (A)** |
| WhatsApp Business API | Not in scope — use wa.me links |
| SARS eFiling / full GL | Out of product scope |
| Multi-tenant SaaS billing | License server + your sales process |

Ship value is the desk. Ops deploy unlocks cloud portal parity.
