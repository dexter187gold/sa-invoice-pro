# Licence server (saip-license)

| | |
|--|--|
| **Live** | https://saip-license.onrender.com |
| **Health** | https://saip-license.onrender.com/health |
| **Source** | Same monorepo as the desk app: `license_server.py`, `start_license.py`, modules under repo root |
| **Service name** | `saip-license` on Render |

## Revoke / delete consistency (2026-11-18)

**Bug:** Revoke marked `requests` archived but left rows in `db["keys"]`. Overview filtered archived requests; **Keys issued** listed all `keys` → ghost keys and wrong counts.

**Fix modules:**
- `license_revoke_consistency.py` — cascade: archive copy → delete from active `keys` → suspend device → clear account binding
- Routes: `POST /owner/revoke-issued`, `POST /owner/delete-key`
- `license_dashboard_fix.py` — lists **active** keys only + Remove button
- Wired in `start_license.py`

After push, **Manual Deploy** on Render for `saip-license` (or wait for auto-deploy). Confirm log line: `[revoke-consistency] registered`.

## Operator checklist
1. Sign in with `SA_OWNER_TOKEN` at /login  
2. Overview → Issued keys → Revoke & remove  
3. Open `/keys` — key must be gone; Active issued keys count drops  
4. Desk app: Refresh status / revalidate — device should not stay licensed  
