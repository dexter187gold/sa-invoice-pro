"""Self-contained owner dashboard for saip-license (no dependency on fragile DASH Jinja)."""
import html
import json
from flask import request


def _esc(v):
    return html.escape("" if v is None else str(v), quote=True)


def _badge(mode):
    m = (mode or "unknown").lower()
    colors = {
        "licensed": ("#052016", "#6ee7b7"),
        "trial": ("#164e63", "#a5f3fc"),
        "suspended": ("#78350f", "#fde68a"),
        "blocked": ("#450a0a", "#fecaca"),
        "handshake": ("#1e293b", "#cbd5e1"),
    }
    bg, fg = colors.get(m, ("#1e293b", "#e2e8f0"))
    return f'<span style="background:{bg};color:{fg};padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700">{_esc(mode or "unknown")}</span>'


def register_safe_dashboard(app, load_fn, dash_template=None, now_display_fn=None):
    def dashboard():
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
        users = [u for u in raw_users.values() if isinstance(u, dict)]
        reqs = [r for r in raw_reqs.values() if isinstance(r, dict)]

        def _seen_key(u):
            return str(u.get("lastSeen") or u.get("handshakeAt") or "")

        users = sorted(users, key=_seen_key, reverse=True)
        pending = [r for r in reqs if r.get("status") == "pending"]
        issued = [r for r in reqs if r.get("key")][-30:]
        n_licensed = len([u for u in users if u.get("mode") == "licensed"])

        device_rows = []
        for u in users:
            hwid = u.get("hwid") or ""
            device_rows.append(
                "<tr>"
                f"<td><code>{_esc(hwid)}</code><br><span style='color:#9bb7aa;font-size:12px'>{_esc(u.get('email') or u.get('company') or 'Unlinked')}</span></td>"
                f"<td>{_badge(u.get('mode'))}</td>"
                f"<td>{_esc(u.get('plan') or '—')}</td>"
                f"<td style='font-size:12px'>{_esc(u.get('lastSeen') or '—')}</td>"
                f"<td><form class='inline' method='post' action='/set-status'>"
                f"<input type='hidden' name='hwid' value='{_esc(hwid)}'/>"
                "<button name='status' value='trial'>Trial</button>"
                "<button name='status' value='licensed'>Licensed</button>"
                "<button name='status' value='suspended'>Suspend</button>"
                "<button name='status' value='blocked'>Block</button>"
                "</form></td></tr>"
            )
        if not device_rows:
            device_rows.append("<tr><td colspan='5' style='color:#9bb7aa'>No devices yet — run Handshake from the desk app.</td></tr>")

        pending_rows = []
        for r in pending:
            hwid = r.get("hwid") or ""
            pending_rows.append(
                "<tr>"
                f"<td><code>{_esc(hwid)}</code></td>"
                f"<td>{_esc(r.get('company') or '—')}</td>"
                f"<td>{_esc(r.get('plan') or '—')}</td>"
                f"<td>{_esc(r.get('at') or r.get('requestedAt') or '—')}</td>"
                f"<td><form class='inline' method='post' action='/issue'>"
                f"<input type='hidden' name='hwid' value='{_esc(hwid)}'/>"
                "<select name='plan'><option value='T'>Trial</option><option value='S'>Standard</option>"
                "<option value='P'>Pro</option><option value='L'>Lifetime</option></select> "
                "<button type='submit'>Issue key</button></form></td></tr>"
            )
        if not pending_rows:
            pending_rows.append("<tr><td colspan='5' style='color:#9bb7aa'>No pending requests.</td></tr>")

        issued_rows = []
        for r in issued:
            issued_rows.append(
                "<tr>"
                f"<td><code>{_esc(r.get('hwid'))}</code></td>"
                f"<td>{_esc(r.get('status'))}</td>"
                f"<td>{_esc(r.get('plan'))}</td>"
                f"<td><code>{_esc(r.get('key'))}</code></td>"
                f"<td>{_esc(r.get('activatedAt') or r.get('issuedAt') or '—')}</td>"
                "</tr>"
            )
        if not issued_rows:
            issued_rows.append("<tr><td colspan='5' style='color:#9bb7aa'>No issued keys yet.</td></tr>")

        banner = ""
        if msg:
            banner = f"<div class='banner'>{_esc(msg)}</div>"
        if err:
            banner += f"<div class='banner err'>{_esc(err)}</div>"

        now = ""
        if callable(now_display_fn):
            try:
                now = now_display_fn()
            except Exception:
                now = ""

        page = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro · Licence Control</title>
<style>
:root{{color-scheme:dark}}
*{{box-sizing:border-box}}
body{{margin:0;font-family:Inter,system-ui,sans-serif;background:radial-gradient(ellipse at 10% 0%,#123c2d 0,transparent 34%),#07110f;color:#e8f5ee;min-height:100vh}}
header{{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid rgba(167,243,208,.14);background:rgba(5,20,15,.92);position:sticky;top:0}}
.brand{{font-weight:800;letter-spacing:-.03em}}.brand small{{display:block;color:#9bb7aa;font-size:11px;font-weight:500;margin-top:3px}}
main{{max-width:1100px;margin:0 auto;padding:24px 18px 48px}}
a{{color:#6ee7b7;text-decoration:none}}
.stats{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}}
.stat{{background:#10231d;border:1px solid rgba(167,243,208,.12);border-radius:12px;padding:14px}}
.stat b{{display:block;font-size:22px;margin-top:4px}}
.panel{{background:#10231d;border:1px solid rgba(167,243,208,.12);border-radius:14px;padding:16px;margin:16px 0}}
.panel h2{{margin:0 0 12px;font-size:16px}}
table{{width:100%;border-collapse:collapse;font-size:13px}}
th,td{{text-align:left;padding:10px 8px;border-bottom:1px solid rgba(167,243,208,.08);vertical-align:top}}
th{{color:#9bb7aa;font-size:11px;text-transform:uppercase;letter-spacing:.06em}}
code{{color:#a7f3d0;font-size:12px}}
.banner{{background:rgba(52,211,153,.12);border:1px solid rgba(110,231,183,.3);padding:10px 12px;border-radius:10px;margin-bottom:12px}}
.banner.err{{background:rgba(251,113,133,.12);border-color:rgba(251,113,133,.35);color:#fecdd3}}
form.inline{{display:flex;flex-wrap:wrap;gap:6px;align-items:center}}
button,select{{background:#263c34;color:#d9eee3;border:1px solid rgba(110,231,183,.2);border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer;font-size:12px}}
button:hover{{filter:brightness(1.1)}}
.links a{{margin-right:14px;font-weight:650}}
@media(max-width:720px){{.stats{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
</style></head>
<body>
<header>
  <div class="brand">SA INVOICE PRO <small>OWNER LICENCE CONTROL · {_esc(now)}</small></div>
  <div class="links">
    <a href="/admin">Admin</a>
    <a href="/admin/billing">Billing</a>
    <a href="/health">Health</a>
    <a href="/">Refresh</a>
  </div>
</header>
<main>
  <h1 style="margin:0 0 6px;letter-spacing:-.03em">Licence command centre</h1>
  <p style="color:#9bb7aa;margin:0 0 12px">Server-authoritative devices · issue keys · set status</p>
  {banner}
  <div class="stats">
    <div class="stat"><span style="color:#9bb7aa">Devices</span><b>{len(users)}</b></div>
    <div class="stat"><span style="color:#9bb7aa">Pending</span><b>{len(pending)}</b></div>
    <div class="stat"><span style="color:#9bb7aa">Issued</span><b>{len(issued)}</b></div>
    <div class="stat"><span style="color:#9bb7aa">Licensed</span><b>{n_licensed}</b></div>
  </div>

  <div class="panel">
    <h2>Pending licence requests</h2>
    <table><thead><tr><th>Device</th><th>Company</th><th>Plan</th><th>Requested</th><th>Issue</th></tr></thead>
    <tbody>{''.join(pending_rows)}</tbody></table>
  </div>

  <div class="panel">
    <h2>Devices</h2>
    <table><thead><tr><th>Device</th><th>Status</th><th>Plan</th><th>Last seen</th><th>Actions</th></tr></thead>
    <tbody>{''.join(device_rows)}</tbody></table>
  </div>

  <div class="panel">
    <h2>Issued keys (latest)</h2>
    <table><thead><tr><th>Device</th><th>Status</th><th>Plan</th><th>Key</th><th>When</th></tr></thead>
    <tbody>{''.join(issued_rows)}</tbody></table>
  </div>

  <div class="panel">
    <h2>Manual issue</h2>
    <form method="post" action="/issue" class="inline">
      <input name="hwid" placeholder="HWID" required style="min-width:220px;background:#0c1d18;color:#e8f5ee;border:1px solid rgba(110,231,183,.25);border-radius:8px;padding:8px 10px"/>
      <select name="plan"><option value="T">Trial</option><option value="S">Standard</option><option value="P">Pro</option><option value="L">Lifetime</option></select>
      <button type="submit">Issue key</button>
    </form>
  </div>
</main>
</body></html>"""
        return page

    if "dashboard" in app.view_functions:
        app.view_functions["dashboard"] = dashboard
    else:
        app.add_url_rule("/", endpoint="dashboard", view_func=dashboard, methods=["GET"])
    return app
