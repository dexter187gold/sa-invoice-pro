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
