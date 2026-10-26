# SA Invoice Pro — optional API + portal store

Express scaffold that can run on Render alongside (or as) **saip-sync**.

## Portal endpoints (SPA-compatible)

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/portal/view/:token` | Public client portal payload |
| POST | `/api/portal/quote-decision` | Accept / reject quote |
| POST | `/api/portal/register` | Shop creates / refreshes token + snapshot |
| GET | `/api/portal/decisions` | Recent decisions for desk |

Data file: `$DATA_DIR/portal-store.json` (default `./data`).

```bash
cd server && npm install && npm start
```

Env: `PORT`, `DATA_DIR`, `PORTAL_PUBLIC_URL` (SPA origin for full portal links).
