"""Developer control centre dashboard for saip-license — devices, status, admin issue."""
import html
from flask import request, redirect


def _esc(v):
    return html.escape("" if v is None else str(v), quote=True)


def register_safe_dashboard(app, load_fn, dash_template, now_display_fn):
    """Register safe developer dashboard routes."""

    PLAN_OPTS = "".join(
        f'<option value="{c}">{c}</option>'
        for c in ("T", "S", "P", "M", "L", "E")
    )

    def _page():
        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        msg = request.args.get("msg") or ""
        err = None
        db = {}
        try:
            db = load_fn() or {}
        except Exception as exc:
            err = f"{type(exc).__name__}: state load failed"

        if not isinstance(db, dict):
            db = {}
        raw_users = db.get("users") if isinstance(db.get("users"), dict) else {}
        raw_reqs = db.get("requests") if isinstance(db.get("requests"), dict) else {}
        raw_keys = db.get("keys") if isinstance(db.get("keys"), dict) else {}
        try:
            from license_revoke_consistency import active_keys as _active_keys
            live_keys = _active_keys({"keys": raw_keys})
        except Exception:
            live_keys = {
                k: v for k, v in raw_keys.items()
                if isinstance(v, dict) and not v.get("revoked") and not v.get("archived")
            }
        users = [u for u in raw_users.values() if isinstance(u, dict)]
        reqs = [r for r in raw_reqs.values() if isinstance(r, dict)]

        def _seen_key(u):
            return str(u.get("lastSeen") or u.get("handshakeAt") or "")

        users = sorted(users, key=_seen_key, reverse=True)
        pending = [r for r in reqs if r.get("status") == "pending"]
        n_licensed = len([u for u in users if str(u.get("mode") or "").lower() == "licensed"])
        n_trial = len([u for u in users if str(u.get("mode") or "").lower() == "trial"])

        device_rows = []
        for u in users:
            hwid = u.get("hwid") or ""
            email = u.get("email") or ""
            phone = u.get("phone") or ""
            plan = u.get("plan") or u.get("planId") or "—"
            mode = u.get("mode") or u.get("status") or "—"
            device_rows.append(
                "<tr>"
                f"<td><code style='font-size:11px'>{_esc(hwid)}</code></td>"
                f"<td>{_esc(email)}</td>"
                f"<td>{_esc(phone)}</td>"
                f"<td>{_esc(plan)}</td>"
                f"<td>{_esc(mode)}</td>"
                f"<td style='font-size:12px'>{_esc(u.get('lastSeen') or '—')}</td>"
                f"<td style='font-size:11px'>"
                f"<form class='inline' method='post' action='/set-status' style='display:flex;flex-wrap:wrap;gap:4px'>"
                f"<input type='hidden' name='hwid' value='{_esc(hwid)}'/>"
                "<button name='status' value='trial'>Trial</button>"
                "<button name='status' value='licensed'>Licensed</button>"
                "<button name='status' value='suspended'>Suspend</button>"
                "<button name='status' value='blocked'>Block</button>"
                "<button name='status' value='expired'>Expire</button>"
                "</form></td></tr>"
            )
        if not device_rows:
            device_rows.append(
                "<tr><td colspan='7' style='color:#9bb7aa'>No devices yet — run Handshake from the desk app.</td></tr>"
            )

        pending_rows = []
        for r in pending:
            hwid = r.get("hwid") or ""
            pending_rows.append(
                "<tr>"
                f"<td><code>{_esc(hwid)}</code></td>"
                f"<td>{_esc(r.get('email') or r.get('company') or '—')}</td>"
                f"<td>{_esc(r.get('plan') or '—')}</td>"
                f"<td>{_esc(r.get('at') or r.get('requestedAt') or '—')}</td>"
                f"<td><form class='inline' method='post' action='/issue'>"
                f"<input type='hidden' name='hwid' value='{_esc(hwid)}'/>"
                f"<select name='plan'>{PLAN_OPTS}</select> "
                "<button type='submit'>Issue key</button></form></td></tr>"
            )
        if not pending_rows:
            pending_rows.append(
                "<tr><td colspan='5' style='color:#9bb7aa'>No pending requests.</td></tr>"
            )

        key_rows = []
        for key, kr in list(live_keys.items())[-40:][::-1]:
            if not isinstance(kr, dict):
                continue
            hwid_val = kr.get("hwid") or ""
            key_rows.append(
                "<tr>"
                f"<td><code>{_esc(key)}</code></td>"
                f"<td>{_esc(kr.get('plan') or '—')}</td>"
                f"<td>{_esc(kr.get('boundEmail') or kr.get('email') or '—')}</td>"
                f"<td>{_esc(kr.get('boundPhone') or kr.get('phone') or '—')}</td>"
                f"<td><code style='font-size:10px'>{_esc(hwid_val or 'unbound')}</code></td>"
                f"<td>{'yes' if kr.get('used') else 'no'}</td>"
                f"<td><form method='post' action='/owner/delete-key' onsubmit=\"return confirm('Remove this key from active issued list?');\">"
                f"<input type='hidden' name='key' value='{_esc(key)}'/>"
                f"<input type='hidden' name='hwid' value='{_esc(hwid_val)}'/>"
                "<button type='submit' style='background:#7f1d1d;border:0;color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer'>Remove</button></form></td>"
                "</tr>"
            )
        if not key_rows:
            key_rows.append(
                "<tr><td colspan='7' style='color:#9bb7aa'>No active keys issued.</td></tr>"
            )

        now = now_display_fn() if callable(now_display_fn) else ""
        alert = ""
        if msg:
            alert = f"<div class='ok'>{_esc(msg)}</div>"
        if err:
            alert += f"<div class='err'>{_esc(err)}</div>"

        body = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro · Licence Control</title>
<style>
:root {{ --bg:#0b1220; --card:#132033; --line:#243247; --text:#e7eef8; --muted:#9bb0c7; --green:#10b981; }}
* {{ box-sizing:border-box }}
body {{ margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--text); }}
header {{ display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--line); }}
.brand {{ font-weight:800; letter-spacing:.04em }}
.brand small {{ display:block; color:var(--muted); font-weight:500; font-size:12px }}
.wrap {{ max-width:1100px; margin:0 auto; padding:20px }}
.stats {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:18px }}
.stat {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px }}
.stat b {{ display:block; font-size:22px }}
.stat span {{ color:var(--muted); font-size:12px }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:16px }}
h2 {{ margin:0 0 10px; font-size:16px }}
table {{ width:100%; border-collapse:collapse; font-size:13px }}
th,td {{ text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align:top }}
.ok {{ background:#064e3b; color:#a7f3d0; padding:10px 12px; border-radius:8px; margin-bottom:12px }}
.err {{ background:#7f1d1d; color:#fecaca; padding:10px 12px; border-radius:8px; margin-bottom:12px }}
a {{ color:#6ee7b7 }}
button,select {{ font:inherit }}
</style></head><body>
<header>
  <div class="brand">SA INVOICE PRO <small>DEVELOPER CONTROL CENTRE · devices · keys · plans</small></div>
  <div style="color:var(--muted);font-size:12px">{_esc(now)} · <a href="/">Overview</a> · <a href="/admin">Billing</a></div>
</header>
<div class="wrap">
{alert}
<section class="stats">
  <div class="stat"><b>{len(users)}</b><span>Registered devices</span></div>
  <div class="stat"><b>{n_licensed}</b><span>Licensed</span></div>
  <div class="stat"><b>{n_trial}</b><span>Trial</span></div>
  <div class="stat"><b>{len(pending)}</b><span>Pending requests</span></div>
  <div class="stat"><b>{len(live_keys)}</b><span>Active issued keys</span></div>
</section>
<div class="card">
  <h2>Devices</h2>
  <div style="overflow:auto"><table><thead><tr><th>HWID</th><th>Email</th><th>Phone</th><th>Plan</th><th>Mode</th><th>Last seen</th><th>Status</th></tr></thead>
  <tbody>{''.join(device_rows)}</tbody></table></div>
</div>
<div class="card">
  <h2>Pending requests</h2>
  <div style="overflow:auto"><table><thead><tr><th>HWID</th><th>Contact</th><th>Plan</th><th>Requested</th><th>Issue</th></tr></thead>
  <tbody>{''.join(pending_rows)}</tbody></table></div>
</div>
<div class="card">
  <h2>Active issued keys</h2>
  <p style="color:var(--muted);font-size:12px;margin-top:0">Revoked keys are archived and hidden. Remove purges the active map so overview counts match.</p>
  <div style="overflow:auto"><table><thead><tr><th>Key</th><th>Plan</th><th>Email</th><th>Phone</th><th>HWID</th><th>Used</th><th>Action</th></tr></thead>
  <tbody>{''.join(key_rows)}</tbody></table></div>
</div>
</div></body></html>"""
        return body

    app.view_functions["dashboard"] = lambda: _page()
    app.add_url_rule("/keys", "keys_issued", _page, methods=["GET"])
    print("[dashboard] safe dashboard + /keys with active-key filter")
