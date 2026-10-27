# Owner go-live checklist — SA Invoice Pro

**Product email:** sainvoicepro@gmail.com  
**Repo tip:** main @ **6.29.0+**  
Grok **cannot** log into your Cloudflare / Render / Google consoles. These steps are yours.

---

## A. Must do for production portal Accept/Decline (critical)

Live **saip-sync** must serve SPA-compatible portal routes:

- `GET /api/portal/view/:token`
- `POST /api/portal/quote-decision`

(saip-sync also has native `/api/portal/:token` paths — client tries both.)

### Deploy saip-sync tip

1. Render service **saip-sync** · auto-deploy from `dexter187gold/saip-sync` `main` (or Manual Deploy).
2. Confirm git-data persistence (`GIT_DATA_*` / saip-sync-data) so `portals.json` survives restarts.
3. Optional env: `FRONTEND_PUBLIC_URL=https://YOUR-PAGES-HOST`.
4. Test:
   ```bash
   curl -s https://saip-sync.onrender.com/api/portal/view/test
   # expect JSON 404 "invalid", not HTML "Cannot GET"
   ```

Until this is live: clients can still Accept offline; shop uses **Quotes → Apply queue** / **Pull cloud decisions**.

---

## B. Frontend (Cloudflare Pages)

1. Pages project builds from `main` of `sa-invoice-pro`.
2. Build: `npm run build` · output: `dist`.
3. After each push, wait for green deploy (or Retry on tip).

---

## C. License server (optional paid tiers)

1. Existing license host · SPA default `https://sa-invoice-license.onrender.com`.
2. Soft alpha license never hard-blocks the desk during free-tier window.

---

## D. Google sign-in (optional)

1. OAuth client · redirect `https://saip-sync.onrender.com/api/auth/google/callback`.
2. Set `GOOGLE_CLIENT_ID` (+ secret) on saip-sync.

---

## E. WhatsApp Business Cloud API (optional)

1. Meta Business + WA product · permanent token + phone number ID.
2. On saip-sync set: `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN`.
3. Webhook: `https://saip-sync.onrender.com/api/wa/webhook`.
4. Desk still works with **wa.me** links without Cloud API.

---

## F. Bench operator checklist (day-one shop)

1. Sign in · Setup (company, VAT, bank).
2. Settings → Cloud: **Sync Now**.
3. White-label: logo + accent.
4. Client → portal link → WhatsApp customer.
5. Quotes: **Pull cloud decisions** / **Apply queue** → **Convert to invoice**.
6. Bank: upload CSV → Apply high-confidence matches.

---

## G. What “100%” means (honest)

| Layer | Status |
|-------|--------|
| Sellable desk app (local/offline) | ~99% in repo |
| Live portal write-back on Render | **Your deploy (A)** |
| WhatsApp Cloud API | Env-gated scaffold — Meta tokens yours |
| SARS eFiling / full GL | Out of product scope |
| Multi-tenant SaaS billing | License server + sales process |

Ship value is the desk. Ops deploy unlocks cloud portal parity.
