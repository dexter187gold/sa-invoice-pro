# Deploy license server v2.4.1

## Required (fixes request/activate never hitting server)

1. On the host that runs the license server (Render / VPS), ensure these two files sit in the **same directory**:
   - `license_server.py`
   - `license_routes_v24.py` (already on `main` in the repo)

2. At the **bottom** of `license_server.py`, **before** `if __name__ == "__main__":`, add:

```python
# --- v2.4 route aliases (request-license / activate) ---
try:
    from license_routes_v24 import register_v24
    register_v24(app)
    print('[v2.4] license_routes_v24 registered')
except Exception as _e:
    print('[v2.4] license_routes_v24 not loaded:', _e)
```

3. Restart the process. Logs must show: `[v2.4] license_routes_v24 registered`

4. New routes available:
   - `POST /api/request-license` and `POST /api/license/request`
   - `POST /api/activate` and `POST /api/license/activate`
   - Existing `/api/request` and `/api/activate-validate` still work (client falls back to them)

## Optional – Updates portal

Also in the full `license_server.py` on this branch:
- `GET /api/updates/latest`
- `GET /api/updates/history`
- `POST /api/updates/publish` (owner token)
- HTML UI at `/updates`

## Admin portal

- `/admin` – push Google Client ID + PayFast to clients via `/api/public-config`
- Set env `SA_OWNER_TOKEN` in production

## Client flow after deploy

1. License page → Handshake  
2. Request license (appears as pending on dashboard `/`)  
3. On dashboard: Issue key (Trial / Standard / Pro / Lifetime)  
4. Client: Activate (or Full activate)


## Durable licence state on Render (GitHub-backed)

The licence server can persist `users.json` (device records, issued keys and activation/status changes) in the existing **private** `dexter187gold/saip-sync-data` repository. Render's local filesystem remains a cache only; GitHub is the durable source of truth when enabled.

On the Render service **sa-invoice-license**, add these environment variables (merge them with existing variables; do not replace the environment):

- `LICENSE_GIT_ENABLED=true`
- `LICENSE_DATA_REPO=dexter187gold/saip-sync-data`
- `LICENSE_DATA_BRANCH=main`
- `LICENSE_DATA_PATH=license-server/users.json`
- `GIT_DATA_TOKEN=<the existing GitHub token used for the private saip-sync-data repository>`

The token must have **Contents: Read and write** permission on `saip-sync-data`. Keep it in Render environment variables only; never commit it or paste it into chat. You can reuse the same private-repository token already configured on the `saip-sync` Render service by copying it directly between the two Render environment-variable settings.

The first successful read migrates an existing local `users.json` into the GitHub path if that path does not yet exist. Thereafter each server load reads the GitHub copy and each save commits the updated state. The same store is used by the main and v2.4 request/activation routes. If GitHub is unavailable or credentials are invalid, the server returns an error instead of silently pretending a change was durably saved.

After setting the variables, redeploy `sa-invoice-license`. Confirm a `license-server/users.json` file appears in the private data repository, then change one test device status, refresh the dashboard, and confirm the same status remains after a manual Render redeploy.
