"""Developer control centre dashboard for saip-license — devices, status, admin issue."""
import html
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
        "pending_request": ("#312e81", "#c7d2fe"),
    }
    bg, fg = colors.get(m, ("#1e293b", "#e2e8f0"))
    return (
        f'<span style="background:{bg};color:{fg};padding:3px 8px;border-radius:999px;'
        f'font-size:11px;font-weight:700">{_esc(mode or "unknown")}</span>'
    )


PLAN_OPTS = (
    '<option value="T">Trial (T)</option>'
    '<option value="S" selected>Solo monthly (S)</option>'
    '<option value="P">Shop monthly (P)</option>'
    '<option value="M">Multi-branch monthly (M)</option>'
    '<option value="L">Lifetime buyout (L)</option>'
    '<option value="E">Enterprise buyout (E)</option>'
)


def register_safe_dashboard(app, load_fn, dash_template=None, now_display_fn=None):
    def dashboard():
        from flask import redirect
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
            device_rows.append(
                "<tr>"
                f"<td><code style='font-size:11px'>{_esc(hwid)}</code>"
                f"<br><span style='color:#9bb7aa;font-size:12px'>{_esc(email or 'No email')}</span>"
                f"<br><span style='color:#9bb7aa;font-size:12px'>{_esc(phone or 'No phone')}</span></td>"
                f"<td>{_badge(u.get('mode'))}</td>"
                f"<td style='font-size:12px'>{_esc(u.get('expiresAt') or u.get('expiry') or '—')}</td>"
                f"<td><strong>{_esc(plan)}</strong>"
                f"<br><span style='font-size:11px;color:#9bb7aa'>seats {_esc(u.get('seats') or '—')}</span></td>"
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
                "<tr><td colspan='6' style='color:#9bb7aa'>No devices yet — run Handshake from the desk app.</td></tr>"
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
        for key, kr in list(raw_keys.items())[-40:][::-1]:
            if not isinstance(kr, dict):
                continue
            key_rows.append(
                "<tr>"
                f"<td><code>{_esc(key)}</code></td>"
                f"<td>{_esc(kr.get('plan') or '—')}</td>"
                f"<td>{_esc(kr.get('boundEmail') or kr.get('email') or '—')}</td>"
                f"<td>{_esc(kr.get('boundPhone') or kr.get('phone') or '—')}</td>"
                f"<td><code style='font-size:10px'>{_esc(kr.get('hwid') or 'unbound')}</code></td>"
                f"<td>{'yes' if kr.get('used') else 'no'}</td>"
                "</tr>"
            )
        if not key_rows:
            key_rows.append(
                "<tr><td colspan='6' style='color:#9bb7aa'>No keys issued yet.</td></tr>"
            )

        now = now_display_fn() if callable(now_display_fn) else ""
        body = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro · Licence Control</title>
<style>
:root {{ --bg:#0b1220; --card:#132033; --line:#243247; --text:#e7eef8; --muted:#9bb0c7; --green:#10b981; --accent:#34d399; }}
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
h2 {{ margin:0 0 12px; font-size:16px }}
table {{ width:100%; border-collapse:collapse; font-size:13px }}
th,td {{ text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align:top }}
th {{ color:var(--muted); font-size:11px; text-transform:uppercase }}
button, .btn {{ background:#0f3d2e; color:#a7f3d0; border:1px solid #14532d; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:12px }}
button:hover {{ filter:brightness(1.1) }}
input, select {{ background:#0b1220; color:var(--text); border:1px solid var(--line); border-radius:8px; padding:8px 10px; width:100%; margin-bottom:8px }}
label {{ display:block; font-size:12px; color:var(--muted); margin:6px 0 4px }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:12px }}
@media (max-width:720px) {{ .grid2 {{ grid-template-columns:1fr }} }}
.msg {{ background:#052016; border:1px solid #14532d; color:#a7f3d0; padding:10px 12px; border-radius:10px; margin-bottom:12px }}
.err {{ background:#450a0a; border:1px solid #7f1d1d; color:#fecaca; padding:10px 12px; border-radius:10px; margin-bottom:12px }}
a {{ color:var(--accent) }}
.inline {{ display:inline }}
</style></head><body>
<header>
  <div class="brand">SA INVOICE PRO <small>DEVELOPER CONTROL CENTRE · devices · keys · plans</small></div>
  <div style="display:flex;gap:12px;align-items:center;font-size:13px">
    <a href="/login">Login</a>
    <a href="/logout">Logout</a>
    <a href="/admin">Payment settings</a>
    <a href="/admin/billing">Billing ledger</a>
    <span style="color:var(--muted)">{_esc(now)}</span>
  </div>
</header>
<div class="wrap">
  {f'<div class="msg">{_esc(msg)}</div>' if msg else ''}
  {f'<div class="err">{_esc(err)}</div>' if err else ''}

  <div class="stats">
    <div class="stat"><b>{len(users)}</b><span>Registered devices</span></div>
    <div class="stat"><b>{n_licensed}</b><span>Licensed</span></div>
    <div class="stat"><b>{n_trial}</b><span>Trial</span></div>
    <div class="stat"><b>{len(pending)}</b><span>Pending requests</span></div>
    <div class="stat"><b>{len(raw_keys)}</b><span>Issued keys</span></div>
  </div>

  <div class="card">
    <h2>Developer issue key (email + phone + HWID bound)</h2>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">
      Generates a unique key that can only activate when the app sends the same email, phone and HWID.
    </p>
    <form method="post" action="/owner/admin-issue-form">
      <div class="grid2">
        <div>
          <label>Customer email *</label>
          <input name="email" type="email" required placeholder="client@shop.co.za"/>
        </div>
        <div>
          <label>Customer phone *</label>
          <input name="phone" type="tel" required placeholder="0821234567"/>
        </div>
        <div>
          <label>Device HWID *</label>
          <input name="hwid" required placeholder="From app License / handshake"/>
        </div>
        <div>
          <label>Plan</label>
          <select name="plan">{PLAN_OPTS}</select>
        </div>
      </div>
      <label>Developer access token (SA_OWNER_TOKEN)</label>
      <input name="token" type="password" required autocomplete="current-password"/>
      <button type="submit">Issue bound key &amp; activate device</button>
    </form>
  </div>

  <div class="card">
    <h2>Adjust licence duration</h2>
    <p style="color:var(--muted);font-size:13px;margin:0 0 12px">Set a new expiry from now or extend the existing expiry. Supports hours, days, months and years. This changes the selected device expiry; it does not alter payment history.</p>
    <form method="post" action="/owner/set-duration">
      <label>Device HWID</label><input name="hwid" required maxlength="256" placeholder="Copy the device HWID from the register"/>
      <div class="grid2">
        <div><label>Duration</label><input name="duration" type="number" min="1" max="36500" value="30" required/></div>
        <div><label>Unit</label><select name="unit"><option value="hours">Hours</option><option value="days" selected>Days</option><option value="months">Months</option><option value="years">Years</option></select></div>
        <div><label>Apply method</label><select name="action"><option value="set">Set expiry from now</option><option value="extend">Extend current expiry</option></select></div>
      </div>
      <button type="submit">Save licence duration</button>
    </form>
  </div>
  <div class="card">
    <h2>Devices &amp; licence status</h2>
    <div style="overflow:auto">
      <table>
        <thead><tr><th>Device / contact</th><th>Status</th><th>Plan</th><th>Last seen</th><th>Admin actions</th></tr></thead>
        <tbody>{''.join(device_rows)}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>Pending licence requests</h2>
    <div style="overflow:auto">
      <table>
        <thead><tr><th>HWID</th><th>Email / co</th><th>Plan</th><th>Requested</th><th>Issue</th></tr></thead>
        <tbody>{''.join(pending_rows)}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>Recent keys (contact binding)</h2>
    <div style="overflow:auto">
      <table>
        <thead><tr><th>Key</th><th>Plan</th><th>Email</th><th>Phone</th><th>HWID</th><th>Used</th></tr></thead>
        <tbody>{''.join(key_rows)}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>Subscription plans (server)</h2>
    <table>
      <thead><tr><th>Plan</th><th>Code</th><th>Seats</th><th>Billing</th><th>Default ZAR</th></tr></thead>
      <tbody>
        <tr><td>Trial</td><td>T</td><td>1</td><td>7 days</td><td>Free</td></tr>
        <tr><td>Solo</td><td>S</td><td>1</td><td>Annual subscription</td><td>R 1&nbsp;999 / yr</td></tr>
        <tr><td>Shop</td><td>P</td><td>5</td><td>Annual subscription</td><td>R 4&nbsp;999 / yr</td></tr>
        <tr><td>Multi-branch</td><td>M</td><td>25</td><td>Annual subscription</td><td>R 11&nbsp;999 / yr</td></tr>
        <tr><td>Lifetime</td><td>L</td><td>1</td><td>One-time buyout</td><td>Admin / sales</td></tr>
        <tr><td>Enterprise</td><td>E</td><td>25</td><td>One-time buyout</td><td>Admin / sales</td></tr>
      </tbody>
    </table>
  </div>
</div>
</body></html>"""
        return body

    app.view_functions["dashboard"] = dashboard
    try:
        app.add_url_rule("/", endpoint="dashboard", view_func=dashboard, methods=["GET"])
    except Exception:
        pass

    @app.post("/owner/admin-issue-form")
    def owner_admin_issue_form():
        from flask import redirect
        from license_owner_ops import (
            _owner_ok,
            _resolve_plan,
            _apply_plan_to_device,
            _mint_key,
            _load,
            _save,
            _now,
        )

        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        token = (request.form.get("token") or "").strip()
        if not _owner_ok(token):
            return redirect("/?msg=" + html.escape("Developer access token rejected", quote=True))
        email = (request.form.get("email") or "").strip().lower()
        phone = "".join(c for c in str(request.form.get("phone") or "") if c.isdigit() or c == "+")
        hwid = (request.form.get("hwid") or "").strip()
        plan = request.form.get("plan") or "S"
        if not email or "@" not in email or not phone or not hwid:
            return redirect("/?msg=email%2C%20phone%20and%20hwid%20required")
        try:
            plan_info = _resolve_plan(plan)
        except ValueError as e:
            return redirect("/?msg=" + html.escape(str(e), quote=True))
        db = _load()
        key = _mint_key(plan_info["code"])
        _apply_plan_to_device(
            db,
            hwid=hwid,
            plan_info=plan_info,
            key=key,
            email=email,
            note=f"Admin form issue for {email}",
        )
        keys = db.setdefault("keys", {})
        kr = keys.get(key) or {}
        kr.update({
            "email": email,
            "phone": phone,
            "boundEmail": email,
            "boundPhone": phone,
            "requireContactMatch": True,
            "issuedBy": "admin-form",
            "issuedAt": _now(),
        })
        keys[key] = kr
        users = db.setdefault("users", {})
        if hwid in users:
            users[hwid]["phone"] = phone
            users[hwid]["email"] = email
        logs = db.setdefault("activation_log", [])
        if not isinstance(logs, list):
            logs = []
        logs.insert(0, {
            "at": _now(), "action": "admin_issue_form",
            "email": email, "phone": phone, "hwid": hwid, "key": key, "plan": plan_info["code"],
        })
        db["activation_log"] = logs[:200]
        _save(db)
        return redirect("/?msg=" + html.escape(f"Issued {key} for {email}", quote=True))

    print("[dashboard] safe control centre registered")
