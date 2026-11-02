# SA Invoice Pro — Client Portal (Sniper)

Standalone portal for customers: login with email + PIN issued from the desk / admin.

## Deploy (Cloudflare Workers assets)

From this folder:

```bash
cd client-portal
npx wrangler deploy
```

Or point Cloudflare Pages at `client-portal/` (no build; publish directory `.`).

## Config

- `config.js` → `window.SAIP_API` (default `https://saip-sync.onrender.com`)
- Live: https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev

## Design

Sniper optic (teal reticle, dark panels) aligned with the desk app.
