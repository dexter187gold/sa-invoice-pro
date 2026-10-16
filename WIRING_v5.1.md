# Wiring v5.1.0 Pro Studio

## Repos
- **sa-invoice-pro** (this repo): web + APK source, optional server/
- **saip-sync** (Render): production backend at https://saip-sync.onrender.com

## Version lock
- package.json / version.json / server health → **5.1.0**
- APK CI should set versionName to 5.1.0

## Live config
1. On **saip-sync**, ensure `config-store.js` + `config-api.js` are deployed and mounted.
2. Admin Lab → Secrets / Public config: set `google_client_id`, announcement, flags.
3. Apps call `GET /api/config/app` (public only).
4. Secrets never returned in clear text to the client.

## Deploy order
1. saip-sync 5.1.0 (config API + admin secrets)
2. sa-invoice-pro web build
3. Rebuild APK from GitHub Actions
4. Confirm both surfaces show 5.1.0 and the same announcement

## Copy config modules to saip-sync
If saip-sync is a separate private repo, copy:
- `server/src/config-store.js`
- `server/src/config-api.js`
and mount with `mountConfigApi(app, { requireAdmin })`.

## Client ID
Without a Google OAuth Client ID in Admin Lab, the Google button will show a clear error: “Configure in Admin Lab”.
