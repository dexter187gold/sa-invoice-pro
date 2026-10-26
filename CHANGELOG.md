# Changelog

## 6.23.0 — Portal server write-back & auth e2e (2026-10-27)

### Client portal (P4)
- **Server:** `server/src/portal-store.js` + `/api/portal/*` routes
  - `GET /view/:token`, `POST /quote-decision`, `POST /register`, `GET /decisions`
  - File store under `DATA_DIR/portal-store.json`
- Decisions persist status on the token snapshot (accepted/rejected + note).

### Platform (P9)
- Playwright **auth harness** (`e2e/helpers.js`, `e2e/auth.spec.js`) — session injection + IndexedDB company seed.
- Desk routes smoke under fake session (invoices, quotes, products).

## 6.22.0 — Inter-branch stock (2026-10-27)

- branchStock transfers on Products.

## 6.21.0 — PDF brand & portal offline (2026-10-27)

- PDF logo/accent; offline portal decision queue.
