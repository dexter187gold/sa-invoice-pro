# SA Invoice Pro License API — DigitalOcean Migration Audit

**Audit date:** 2026-10-31  
**Repository:** `dexter187gold/sa-invoice-pro`  
**Target:** DigitalOcean App Platform (GitHub-connected Docker service)  
**Migration mode:** Parallel staging; no production cutover authorised by this document.

## Executive decision

**Do not expose a new public DigitalOcean service until the security and durability blockers below are resolved.** The current service is a Flask API with a GitHub-backed JSON store. The lowest-cost DigitalOcean App Platform container currently starts at **US$5/month** (1 shared vCPU, 512 MiB RAM, fixed single instance, 50 GiB transfer; no autoscaling). This is a viable staging/initial production footprint only after load and memory checks. A paid managed database is not required for the first migration phase if the existing private Git-backed store remains the durable source of truth.

DigitalOcean App Platform can deploy from GitHub or a Dockerfile, encrypt environment variables, and retain up to 10 revisions for rollback. It does not provide a DigitalOcean control-plane connection in this ChatGPT workspace; provisioning and secret entry therefore require the account owner to connect/authorise the account or complete the final dashboard step.

## Current deployment observed

- Render service: `sa-invoice-license`
- Render service ID: `srv-daiqt37qj5pc73b7sd90`
- Runtime: Python / Flask
- Build command: `pip install flask`
- Start command: `python start_license.py`
- Branch: `main`
- Render plan: `free`
- Region: `frankfurt`
- Latest observed deploy: `dep-dbj57ubncjis73d8hnv0`, status `live`, commit `218fbc2f61e66161acbeaa034791ddfeebdaf73a`
- Render reports the service as not suspended. A live deployment does not, by itself, prove every API route is healthy.
- Keep this service and its URL available as the rollback target until the new host passes acceptance.

## Application and data architecture found

- Entrypoint: `start_license.py`; exports `app = license_server.app`.
- Main app: `license_server.py`.
- Alias routes: `license_routes_v24.py`.
- Payment routes: `license_billing.py`.
- Durable store: `license_git_store.py`.
- Durable state repository: private `dexter187gold/saip-sync-data`.
- Durable state path: `license-server/users.json` on branch `main`.
- State sections are at least `users`, `requests`, and `keys`; payment code also stores account, pending payment, and transaction sections in the same JSON document. The Git store merges extra top-level sections rather than discarding them.
- Local `users.json` is a cache when Git persistence is enabled.
- `owner_config.json` is currently local-only. It contains Google client ID, PayFast configuration and Paystack configuration; this is a critical portability/data-loss blocker for container hosting.

## API route compatibility inventory

Preserve these paths and HTTP methods exactly unless a separately versioned change is approved:

### Existing licence/device API
- `POST /api/handshake`
- `POST /api/request`
- `POST /api/claim`
- `POST /api/activate-validate`
- `POST /api/device-status`
- `POST /api/heartbeat`
- `POST /api/set-status`

### v2.4 aliases
- `POST /api/request-license`
- `POST /api/license/request`
- `POST /api/activate`
- `POST /api/license/activate`
- `GET /api/license/status`

### Payment and billing
- `GET /api/billing/plans`
- `GET|POST /api/billing/checkout`
- `POST /api/billing/itn` (PayFast)
- `GET /api/billing/status`
- `POST /api/billing/claim`
- `POST /api/billing/paystack/initialize`
- `POST /api/billing/paystack/webhook`
- `GET /api/billing/paystack/status`

### Owner/admin surfaces
- `GET /`
- `GET /admin`
- `POST /admin/save`
- `GET|POST /admin/billing`
- `POST /set-status`
- `POST /owner/reset-for-repurchase`
- `GET /api/public-config`

## Secret/config inventory — names only, no values

### Licence and owner
- `SA_OWNER_TOKEN` — must be set explicitly; no fallback/default allowed.
- Existing licence checksum compatibility constant is currently embedded in source as `SECRET`. Do not change it during migration; existing key compatibility depends on it. Plan a separately versioned key migration if it ever needs rotation.
- `GIT_DATA_TOKEN` (or legacy `GITHUB_TOKEN`) — GitHub Contents read/write permission scoped to the private data repository.
- `LICENSE_GIT_ENABLED=true`
- `LICENSE_DATA_REPO=dexter187gold/saip-sync-data`
- `LICENSE_DATA_BRANCH=main`
- `LICENSE_DATA_PATH=license-server/users.json`

### PayFast
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- The existing owner config may also contain the same PayFast values; reconcile them without printing or committing values.

### Paystack
- `PAYSTACK_SECRET_KEY`
- Existing owner config may contain a Paystack secret and mode. Keep secret values encrypted and never include them in public config or logs.

### Runtime / app settings
- `PORT` (provided by platform)
- `SA_PRICE_SOLO`
- `SA_PRICE_SHOP`
- `SA_PRICE_MULTI`
- `SA_WEBSITE_URL`
- `SA_LICENSE_SERVER_URL`
- `SA_APP_URL`

The current code may also hold Google client ID and payment settings in `owner_config.json`; this file must be migrated into durable encrypted configuration or a durable private store before cutover.

## Critical findings — migration blockers

1. **Unauthenticated root dashboard:** `GET /` renders user/device/licence records and owner actions without an owner login gate.
2. **Unauthenticated admin configuration page:** `GET /admin` renders configured payment credentials into HTML before authentication.
3. **Public secret exposure:** `GET /api/public-config` returns the entire PayFast object, including fields that must never be public (merchant key/passphrase). Public clients should receive only an explicit allowlist of non-secret settings.
4. **Known default owner token:** `OWNER_TOKEN` falls back to a fixed source-code value. Production must fail closed if `SA_OWNER_TOKEN` is not set; no known default is acceptable.
5. **Ephemeral owner configuration:** `owner_config.json` is not stored through `license_git_store.py`; container redeploys/restarts may lose owner/payment configuration.
6. **Git-backed JSON concurrency:** the store retries GitHub content conflicts and merges dictionaries, but read-modify-write is not a transactional database. Concurrent payment webhooks/device updates need idempotency and race tests before scaling beyond one instance.
7. **CORS is wildcard:** current API adds `Access-Control-Allow-Origin: *`. Restrict to the actual app/portal origins where compatible with desktop/mobile clients.
8. **Health endpoint absent:** add a non-sensitive `/healthz` endpoint for platform health checks. It must not expose data or secrets.

## Recommended low-budget target

- DigitalOcean App Platform, one fixed shared container at the current published entry price of US$5/month (512 MiB RAM, one instance, 50 GiB transfer).
- Deploy from the existing GitHub repository `main` using a root Dockerfile.
- Start with one instance because the current JSON store is not a transactional multi-writer database.
- Use Singapore or Frankfurt only after comparing actual latency from South Africa; do not assume region proximity without a real test.
- Keep the existing private GitHub JSON repository as the durable licence/payment record during phase one.
- Do not add a paid managed database until measured usage or transaction safety requirements justify it.
- Monitor memory, response latency, GitHub API rate limits, webhook retries and monthly egress. Upgrade the container only when measured need warrants it.

## Safe execution sequence

1. Record current Render service/deploy details and preserve the rollback URL.
2. Fix admin authentication, public-config secret allowlisting, default owner token, CORS policy and health endpoint.
3. Move owner/payment configuration to durable storage with a migration that imports the current values once, verifies counts/fields, and does not log secrets.
4. Add Dockerfile and pinned runtime dependencies; verify a clean container build and the complete API route inventory.
5. Create a separate DigitalOcean staging service from GitHub `main`, one instance, encrypted environment variables, and health check.
6. Copy secrets directly from the existing secret manager/Render dashboard into DigitalOcean encrypted variables. Never place secret values in GitHub or chat.
7. Confirm the new service reads the exact existing data repository/path and can validate a known existing licence without changing its status.
8. Test new request, activation, device status, owner actions, PayFast sandbox ITN, Paystack test webhook, duplicate webhook, retry, and persistence across a redeploy.
9. Compare state before/after; require exact preservation of users, requests, keys, accounts, pending payments, and transactions.
10. Only then change the app's licence API base URL. Keep Render live and unchanged for rollback through an agreed observation period.
11. Roll back by restoring the previous API base URL; do not dual-write to both hosts.

## Acceptance gates

- All route aliases return expected status/schema on DigitalOcean.
- Existing licence keys validate with unchanged checksum behavior.
- Existing device statuses and expiry values remain unchanged.
- Payment credentials remain private; public config contains no merchant key, passphrase or Paystack secret.
- Existing PayFast and Paystack test flows remain verified and idempotent.
- Data survives a DigitalOcean redeploy/restart.
- A failed deploy can be rolled back without touching Render or the Git-backed data.
- No secret values appear in repository history, logs, build output or browser responses.
- A synthetic known licence can be tested without altering a real customer's record.

## References

- DigitalOcean App Platform pricing: https://www.digitalocean.com/pricing/app-platform
- DigitalOcean App Platform pricing documentation: https://docs.digitalocean.com/products/app-platform/details/pricing/
- Dockerfile builds: https://docs.digitalocean.com/products/app-platform/reference/dockerfile/
- Creating App Platform apps and encrypted environment variables: https://docs.digitalocean.com/products/app-platform/how-to/create-apps/
- Health checks: https://docs.digitalocean.com/products/app-platform/how-to/manage-health-checks/
