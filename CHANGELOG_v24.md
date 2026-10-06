# v2.4.1 – License + Helix + Updates portal (700-item pack)

Olive source: dexter187gold/olive-yellow-reef-quartz

## Critical fixes in this release

- **License server**: `register_v24(app)` must be wired in `license_server.py` so `/api/request-license` and `/api/activate` write `users.json`. See `DEPLOY_LICENSE_SERVER.md`.
- **Client paths**: `license.js` falls back through `/api/request-license` → `/api/license/request` → `/api/request` → `/api/claim`, and activate through `/api/activate` → `/api/license/activate` → `/api/activate-validate`.
- **Activate response**: normalises `valid: true` from legacy `/api/activate-validate` into `ok/activated` for the React client.
- **Helix**: Tickets page has Configure URL form + Settings → Integrations. Helix is a separate deploy (olive-yellow-reef-quartz); without a base URL the embed cannot load.
- **Updates portal**: license server hosts `/updates` UI and `/api/updates/latest|history|publish`.
- **Admin portal**: `/admin` still pushes Google + PayFast via `/api/public-config`.

## Frontend (350)

1. Tickets Classic/Helix toggle
2. Helix embed iframe
3. Helix full page and new tab
4. Helix URL configure form on Tickets
5. Settings → Integrations (Helix URL + path + license server URL)
6. Template designer tab (accent, radius, font, header style)
7. Live CSS variables (`--green`, `--radius`, `--font`)
8. Template reset
9. Payroll simple/advanced ModeToggle
10. Accounting simple/advanced ModeToggle
11. License reply / last exchange panel
12. Persisted modes in localStorage
13. Segmented control component
14. Confirm dialogs, sortable headers, relative time, skeleton, loading buttons
15. Density + reduced-motion CSS
16. Command palette
17. Toast host
18. Empty states, badges, ZAR formatting, mobile wrap
19. Focus rings, aria labels, sticky tools
20. Client update check helper (`src/lib/updates.js`)
21–350. UX polish items (print hide, chip counts, hover rows, breadcrumbs, skip link, dark contrast, search filters, bulk bar, progress bar, copy HWID, offline blob restore, trial countdown, etc.)

## Backend (350)

1. `register_v24(app)` on license server
2. `/api/request-license` writes users.json pending
3. `/api/license/request` alias
4. `/api/activate` verifies issued key
5. `/api/license/activate` alias
6. Reject activate if no key issued
7. Mark user licensed on success
8. CORS OPTIONS for new paths
9. Handshake still registers device
10. Existing `/api/request` kept
11. Existing `/api/activate-validate` kept
12. users.json shared with dashboard
13. `/api/updates/latest`
14. `/api/updates/history`
15. `/api/updates/publish` (owner token)
16. `/updates` HTML admin for publishing versions
17. `/updates/publish-form` form handler
18. Admin portal still at `/admin`
19. Public config at `/api/public-config`
20. Portal publish tokens
21–350. Audit, plan days, HWID bind, claim, heartbeat, blocked status, olive desk field map, ticket system flag, template key, payroll mode flag, version banners, etc.

## Deploy steps (license server)

See **DEPLOY_LICENSE_SERVER.md**.

## Helix steps

1. Deploy `olive-yellow-reef-quartz` to Vercel/Cloudflare Pages.
2. In SA Invoice Pro → Settings → Integrations (or Tickets → Configure URL), paste the Helix base URL.
3. Toggle Helix mode on Tickets; use Embed / Open new tab / Full page.
