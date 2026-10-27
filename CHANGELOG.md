# Changelog

## 6.24.0 — Portal snapshot fallback & go-live (2026-10-27)

### Portal / sync
- `Sync.createPortalLink` accepts full **snapshot** (company, client, quotes, invoices).
- After `/api/portal/create`, best-effort `POST /api/portal/register` refresh for decision write-back servers.
- Falls back to `/api/portal/register` when create is missing.
- Clients page passes snapshot on portal create.

### Docs
- `docs/OWNER_GO_LIVE.md` — manual steps (Render portal routes, Cloudflare, OAuth, day-one shop).

### Note
Live saip-sync still lacks `view` / `quote-decision` until owner deploys `server/` portal routes.

## 6.23.0 — Portal server write-back & auth e2e

Express portal-store + Playwright auth harness.
