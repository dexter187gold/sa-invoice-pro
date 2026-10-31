# SA Invoice Pro deployment environment backup
Snapshot date: 2026-10-31
Purpose: preserve deployment configuration before promoting the Cloudflare Pages app hostname.

## Canonical deployment targets
- App URL planned: https://sa-invoice-pro.pages.dev
- Existing production Worker (keep active): https://sa-invoice-pro.pcrepairdex.workers.dev
- Sync API: https://saip-sync.onrender.com
- License API: https://sa-invoice-license.onrender.com
- Client portal Worker: https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev
- Marketing website: https://sa-invoice.pages.dev

## Cloudflare account and current Pages project
- Account name: Pcrepairdex@gmail.com's Account
- Account ID: b6de10eddfa965791b53b80bd98842b6
- Existing Pages project: sa-invoice-pro-preview
- Pages project ID: bf4c283b-a6ec-4c97-a695-53e00545862c
- Repository: dexter187gold/sa-invoice-pro
- Production branch: main
- Build command: npm run build
- Output directory: dist
- Root directory: /
- Framework detected: react-router
- Framework version: 7.18.5
- Compatibility date: 2026-10-26
- Compatibility flags: none
- Pages production environment variables: none configured (API returned env_vars: null / empty)
- Pages preview environment variables: none configured (API returned env_vars: null / empty)
- Latest deployment at snapshot: 149e0d76-f955-4ba3-8ed0-be213cd0bcf9
- Latest deployment commit: 4dd3193c775988c2da5cd98264fed50c0f33524c
- Latest deployment result: success

## Production Worker configuration
- Worker name: sa-invoice-pro
- Compatibility date: 2024-01-01
- Compatibility flags: none
- Bindings: AI (Workers AI), ASSETS (static assets)
- Plain-text vars: none
- Secret bindings: none returned by Cloudflare
- Worker script config is maintained in wrangler.toml and src/worker.js.
- The Worker provides /api/assistant; app static assets are served through ASSETS.
- Do not delete or disable this Worker during Pages promotion. Pages must proxy /api/assistant to it.

## App build-time configuration
Defined in src/config.js:
- VITE_CLIENT_PORTAL_URL defaults to https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev
- VITE_SYNC_API_URL defaults to https://saip-sync.onrender.com
- VITE_LICENSE_API_URL defaults to https://sa-invoice-license.onrender.com
- VITE_PAYFAST_SANDBOX defaults to enabled unless explicitly set to "false"
- VITE_BASE defaults to /
No Pages build-time environment variables were configured in the Pages project at snapshot time.

## Other hosting services
- Render sync service: saip-sync (service ID srv-db5k07vlk1mc73a9dtb0), repository dexter187gold/saip-sync, branch main, auto-deploy enabled.
- Render license service: sa-invoice-license (service ID srv-daiqt37qj5pc73b7sd90), repository dexter187gold/sa-invoice-pro, branch main, auto-deploy enabled.
- Render environment variable values are not exposed by the connected Render tools in this session. This backup therefore records known service identities and app endpoint configuration, but is NOT a credential-value export of Render. Before any migration or destructive change, export the actual variable names/values securely from each Render service's Environment dashboard and store them in a password manager or encrypted offline vault.
- Never put production secrets, signing keys, tokens, passwords, or private credentials in this repository. Cloudflare secret values are write-only and cannot be read back through the API; preserve them in the original secret manager/password vault.

## Recovery notes
1. The existing Worker URL remains a rollback target and must remain deployed.
2. If Pages needs to be rolled back, restore the previous Pages project name/config and use the Worker app URL.
3. Do not assume Pages build success proves backend/API functionality; smoke-test authentication, sync, licensing, client portal, and /api/assistant.
