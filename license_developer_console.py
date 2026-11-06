"""Card-based, multi-page developer licence control centre.

The console is intentionally developer-only. It reuses the existing authenticated
licence APIs and Git-backed state; it does not expose customer-facing admin routes.
"""
import html
from flask import redirect, request


def _e(value):
    return html.escape("" if value is None else str(value), quote=True)


def _status(value):
    mode = str(value or "unknown").lower()
    palette = {
        "licensed": ("#063b2b", "#a7f3d0"),
        "trial": ("#164e63", "#a5f3fc"),
        "suspended": ("#78350f", "#fde68a"),
        "blocked": ("#7f1d1d", "#fecaca"),
        "expired": ("#4c1d95", "#ddd6fe"),
        "pending_request": ("#312e81", "#c7d2fe"),
    }
    bg, fg = palette.get(mode, ("#263c34", "#d1fae5"))
    return f'<span class="status-pill" style="background:{bg};color:{fg}">{_e(mode)}</span>'


def register_developer_console(app, load_fn, now_display_fn=None):
    def render_page(view):
        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        db = load_fn() or {}
        if not isinstance(db, dict):
            db = {}
        raw_users = db.get("users") if isinstance(db.get("users"), dict) else {}
        raw_requests = db.get("requests") if isinstance(db.get("requests"), dict) else {}
        raw_keys = db.get("keys") if isinstance(db.get("keys"), dict) else {}
        users = [u for u in raw_users.values() if isinstance(u, dict)]
        requests_pending = [r for r in raw_requests.values() if isinstance(r, dict) and r.get("status") == "pending"]
        users.sort(key=lambda u: str(u.get("lastSeen") or u.get("handshakeAt") or ""), reverse=True)
        licensed = sum(1 for u in users if str(u.get("mode") or "").lower() == "licensed")
        trial = sum(1 for u in users if str(u.get("mode") or "").lower() == "trial")
        now = now_display_fn() if callable(now_display_fn) else ""
        titles = {
            "overview": ("Developer overview", "Licence operations at a glance"),
            "devices": ("Device licences", "Control status, expiry and device access"),
            "requests": ("Licence requests", "Review requests and issue bound keys"),
            "keys": ("Keys & issuing", "Issue customer-bound keys and inspect recent activations"),
            "plans": ("Plans & pricing", "Server-side plan limits and default billing periods"),
        }
        title, subtitle = titles[view]
        device_cards = []
        for user in users:
            hwid = str(user.get("hwid") or "")
            email = str(user.get("email") or "No email")
            phone = str(user.get("phone") or "Not supplied")
            plan = str(user.get("plan") or user.get("planId") or "—")
            expiry = str(user.get("expiresAt") or user.get("expiry") or "Not set")
            search = (hwid + " " + email + " " + phone + " " + plan).lower()
            device_cards.append(
                f"""<article class="device-card" data-search="{_e(search)}">
                  <div class="card-top"><div><strong>{_e(email)}</strong><code>{_e(hwid)}</code></div>{_status(user.get('mode'))}</div>
                  <div class="meta-grid">
                    <div><span>Plan</span><b>{_e(plan)}</b></div>
                    <div><span>Seats</span><b>{_e(user.get('seats') or '—')}</b></div>
                    <div><span>Expires</span><b>{_e(expiry)}</b></div>
                    <div><span>Last seen</span><b>{_e(user.get('lastSeen') or '—')}</b></div>
                  </div>
                  <div class="muted-line">Phone · {_e(phone)}</div>
                  <form class="status-actions" method="post" action="/set-status">
                    <input type="hidden" name="hwid" value="{_e(hwid)}"/>
                    <button name="status" value="trial">Trial</button>
                    <button name="status" value="licensed">Activate</button>
                    <button name="status" value="suspended">Suspend</button>
                    <button name="status" value="blocked">Block</button>
                    <button name="status" value="expired">Expire</button>
                  </form>
                </article>"""
            )
        if not device_cards:
            device_cards.append('<div class="empty">No registered devices yet. Run Handshake from the desk app to register one.</div>')

        request_cards = []
        for item in requests_pending:
            hwid = str(item.get("hwid") or "")
            request_cards.append(
                f"""<article class="request-card">
                  <div class="card-top"><strong>{_e(item.get('email') or item.get('company') or 'New licence request')}</strong><span class="status-pill pending">Pending</span></div>
                  <code>{_e(hwid)}</code>
                  <div class="meta-grid"><div><span>Requested plan</span><b>{_e(item.get('plan') or '—')}</b></div><div><span>Requested</span><b>{_e(item.get('at') or item.get('requestedAt') or '—')}</b></div></div>
                  <form method="post" action="/issue" class="issue-inline"><input type="hidden" name="hwid" value="{_e(hwid)}"/><select name="plan"><option value="T">Trial</option><option value="S" selected>Solo</option><option value="P">Shop</option><option value="M">Multi-branch</option><option value="L">Lifetime</option><option value="E">Enterprise</option></select><button type="submit">Issue key</button></form>
                </article>"""
            )
        if not request_cards:
            request_cards.append('<div class="empty">There are no pending licence requests.</div>')

        key_cards = []
        for key, record in list(raw_keys.items())[-60:][::-1]:
            if not isinstance(record, dict):
                continue
            key_cards.append(
                f"""<article class="key-card">
                  <div class="card-top"><code>{_e(key)}</code><span class="status-pill">{'Used' if record.get('used') else 'Unused'}</span></div>
                  <div class="meta-grid">
                    <div><span>Plan</span><b>{_e(record.get('plan') or '—')}</b></div>
                    <div><span>Customer</span><b>{_e(record.get('boundEmail') or record.get('email') or '—')}</b></div>
                    <div><span>Phone</span><b>{_e(record.get('boundPhone') or record.get('phone') or '—')}</b></div>
                    <div><span>Expiry</span><b>{_e(record.get('expiresAt') or 'Set on activation')}</b></div>
                  </div>
                  <div class="muted-line">HWID · {_e(record.get('hwid') or 'Unbound')}</div>
                </article>"""
            )
        if not key_cards:
            key_cards.append('<div class="empty">No licence keys have been issued yet.</div>')

        plans = [
            ("Trial", "T", "1 device", "7 days", "Free"),
            ("Solo", "S", "1 device", "Annual subscription", "R 1 999 / year"),
            ("Shop", "P", "5 seats", "Annual subscription", "R 4 999 / year"),
            ("Multi-branch", "M", "25 seats", "Annual subscription", "R 11 999 / year"),
            ("Lifetime", "L", "1 device", "One-time buyout", "Admin / sales"),
            ("Enterprise", "E", "25 seats", "One-time buyout", "Admin / sales"),
        ]
        plan_cards = "".join(
            f'<article class="plan-card"><span class="plan-code">{_e(code)}</span><h3>{_e(name)}</h3><strong>{_e(price)}</strong><p>{_e(seats)} · {_e(period)}</p></article>'
            for name, code, seats, period, price in plans
        )
        nav = "".join(
            f'<a class="{"active" if view == key else ""}" href="{path}">{label}</a>'
            for key, path, label in (
                ("overview", "/", "Overview"),
                ("devices", "/devices", "Devices & licences"),
                ("requests", "/requests", "Requests"),
                ("keys", "/keys", "Keys & issuing"),
                ("plans", "/plans", "Plans & pricing"),
            )
        )
        overview = """
          <section class="panel-card"><h2>Developer quick access</h2><p class="muted-line">Choose a separate workspace below. Device and key controls are not shown on this overview page.</p></section>
          <section class="quick-grid">
            <a class="quick-card" href="/devices"><strong>Manage device licences</strong><span>Activate, suspend, block, expire and adjust duration</span></a>
            <a class="quick-card" href="/requests"><strong>Review licence requests</strong><span>Review pending requests and issue bound keys</span></a>
            <a class="quick-card" href="/keys"><strong>Keys & issuing</strong><span>Issue customer-bound keys and inspect recent keys</span></a>
            <a class="quick-card" href="/plans"><strong>Plans & pricing</strong><span>Review server-side plan and seat limits</span></a>
            <a class="quick-card" href="/admin/billing"><strong>Billing ledger</strong><span>Read-only payment history and CSV export</span></a>
          </section>"""
        issue_form = """
          <section class="panel-card"><h2>Issue a customer-bound licence</h2>
            <p class="muted-line">Create a key bound to the customer's email, phone and device HWID.</p>
            <form method="post" action="/owner/admin-issue-form">
              <div class="form-grid">
                <div><label>Customer email</label><input name="email" type="email" required placeholder="client@shop.co.za"/></div>
                <div><label>Customer phone</label><input name="phone" type="tel" required placeholder="0821234567"/></div>
                <div><label>Device HWID</label><input name="hwid" required placeholder="From app handshake"/></div>
                <div><label>Plan</label><select name="plan"><option value="T">Trial</option><option value="S" selected>Solo</option><option value="P">Shop</option><option value="M">Multi-branch</option><option value="L">Lifetime</option><option value="E">Enterprise</option></select></div>
              </div>
              <label>Developer access token</label><input name="token" type="password" required autocomplete="current-password"/>
              <button type="submit">Issue bound key</button>
            </form>
          </section>"""
        duration_form = """
          <section class="panel-card"><h2>Adjust licence duration</h2>
            <p class="muted-line">Set a new expiry from now or extend the current expiry. Hours, days, calendar months and years are supported. The server enforces the expiry.</p>
            <form method="post" action="/owner/set-duration">
              <label>Device HWID</label><input name="hwid" required maxlength="256" placeholder="Copy the HWID from a device card"/>
              <div class="form-grid">
                <div><label>Duration</label><input name="duration" type="number" min="1" max="87600" value="30" required/></div>
                <div><label>Unit</label><select name="unit"><option value="hours">Hours</option><option value="days" selected>Days</option><option value="months">Months</option><option value="years">Years</option></select></div>
                <div><label>Apply method</label><select name="action"><option value="set">Set expiry from now</option><option value="extend">Extend current expiry</option></select></div>
              </div>
              <button type="submit">Save licence duration</button>
            </form>
          </section>"""
        content = {
            "overview": overview,
            "devices": duration_form + '<section class="device-grid">' + "".join(device_cards) + '</section><div class="search-wrap"><input id="device-search" type="search" placeholder="Search devices by email, phone, plan or HWID" oninput="filterDevices()"/></div>',
            "requests": '<section class="request-grid">' + "".join(request_cards) + '</section>',
            "keys": issue_form + '<section class="key-grid">' + "".join(key_cards) + '</section>',
            "plans": '<section class="plan-grid">' + plan_cards + '</section>',
        }[view]
        if view == "devices":
            # Put the filter above the cards, not below them.
            content = duration_form + '<div class="search-wrap"><input id="device-search" type="search" placeholder="Search devices by email, phone, plan or HWID" oninput="filterDevices()"/></div><section class="device-grid">' + "".join(device_cards) + '</section>'
        message = _e(request.args.get("msg") or "")
        page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro · Developer Licence Console</title>
<style>
:root{{--bg:#07110f;--panel:#10231d;--line:#244437;--text:#e8f5ee;--muted:#9bb7aa;--mint:#6ee7b7}}
*{{box-sizing:border-box}}body{{margin:0;background:radial-gradient(ellipse at 15% 0%,#123c2d 0,transparent 36%),var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}}
header{{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 22px;border-bottom:1px solid var(--line)}}
.brand{{font-weight:850;letter-spacing:.03em}}.brand small{{display:block;color:var(--muted);font-size:11px;font-weight:500}}
.top-actions{{display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px}}a{{color:var(--mint);text-decoration:none}}
nav{{display:flex;gap:7px;padding:10px 22px;border-bottom:1px solid var(--line);overflow-x:auto;background:#0b1b16}}nav a{{white-space:nowrap;padding:8px 12px;border:1px solid transparent;border-radius:9px;color:var(--muted)}}nav a.active,nav a:hover{{background:#123b2d;border-color:#23634b;color:#d1fae5}}
main{{max-width:1200px;margin:auto;padding:20px}}h1{{font-size:23px;margin:0 0 4px}}h2{{font-size:16px;margin:0 0 12px}}h3{{margin:8px 0;font-size:16px}}
.subtitle,.muted-line{{color:var(--muted);font-size:12px}}.message{{background:#123b2d;border:1px solid #23634b;border-radius:10px;padding:10px;margin:12px 0}}
.stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0}}
.stat,.panel-card,.quick-card,.device-card,.request-card,.key-card,.plan-card{{background:linear-gradient(145deg,#142b24,#0c1f18);border:1px solid var(--line);border-radius:14px;padding:15px;min-width:0}}
.stat b{{display:block;font-size:24px;color:var(--mint)}}.stat span{{color:var(--muted);font-size:11px}}
.quick-grid,.device-grid,.request-grid,.key-grid,.plan-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:13px;margin:16px 0}}
.quick-card{{display:block}}.quick-card strong{{display:block;color:#d1fae5;margin-bottom:5px}}.quick-card span{{color:var(--muted);font-size:12px}}
.card-top{{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}}.card-top strong{{overflow-wrap:anywhere}}code{{font-size:11px;color:#a7c5b7;overflow-wrap:anywhere}}
.status-pill,.plan-code{{display:inline-block;border-radius:99px;padding:3px 9px;background:#123b2d;color:#a7f3d0;border:1px solid #23634b;font-size:11px}}
.meta-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}}.meta-grid span{{display:block;color:var(--muted);font-size:11px}}.meta-grid b{{display:block;font-size:12px;overflow-wrap:anywhere}}
.status-actions{{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}}button,.btn{{background:#14533d;color:#d1fae5;border:1px solid #287452;border-radius:9px;padding:8px 11px;cursor:pointer;font-size:12px;font-weight:700}}button:hover,.btn:hover{{filter:brightness(1.12)}}.status-actions button{{flex:1 1 70px}}
label{{display:block;color:var(--muted);font-size:12px;margin:8px 0 4px}}input,select{{width:100%;background:#071b16;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:10px;margin-bottom:8px}}
.form-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}.empty{{padding:24px;text-align:center;color:var(--muted);border:1px dashed #3a6553;border-radius:12px}}
.search-wrap{{max-width:440px;margin:12px 0}}.plan-card strong{{display:block;font-size:18px;color:var(--mint)}}.plan-card p{{color:var(--muted);font-size:12px}}
@media(max-width:650px){{header{{padding:13px}}nav{{padding:8px 12px}}main{{padding:13px}}.form-grid{{grid-template-columns:1fr}}}}
</style></head><body>
<header><div class="brand">SA INVOICE PRO <small>DEVELOPER CONTROL CENTRE · private licence operations</small></div><div class="top-actions"><span>{_e(now)}</span><a href="{_e(request.path)}">Refresh</a><a href="/admin/billing">Billing ledger</a><a href="/admin">Payment settings</a><a href="/logout">Sign out</a></div></header>
<nav>{nav}</nav><main><h1>{_e(title)}</h1><div class="subtitle">{_e(subtitle)}</div>
{('<div class="message">' + message + '</div>') if message else ''}
<section class="stats"><div class="stat"><b>{len(users)}</b><span>Registered devices</span></div><div class="stat"><b>{licensed}</b><span>Licensed</span></div><div class="stat"><b>{trial}</b><span>Trial</span></div><div class="stat"><b>{len(requests_pending)}</b><span>Pending requests</span></div><div class="stat"><b>{len(raw_keys)}</b><span>Issued keys</span></div></section>
{content}
</main><script>
function filterDevices(){{const q=(document.getElementById('device-search')?.value||'').toLowerCase();document.querySelectorAll('.device-card').forEach(el=>{{el.hidden=!el.dataset.search.includes(q)}})}}
</script></body></html>"""
        return page

    # The original route is retained, but its view is replaced by this modern
    # developer-only console. The sections below load as separate pages.
    app.view_functions["dashboard"] = lambda: render_page("overview")
    for view in ("devices", "requests", "keys", "plans"):
        endpoint = "developer_" + view
        try:
            app.add_url_rule("/" + view, endpoint=endpoint, view_func=lambda view=view: render_page(view), methods=["GET"])
        except Exception:
            app.view_functions[endpoint] = lambda view=view: render_page(view)

    print("[developer-console] card-based multi-page licence control centre registered")
