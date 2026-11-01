"""Safe owner dashboard — registered from start_license after license_server import."""
import json
from flask import request, render_template_string


def register_safe_dashboard(app, load_fn, dash_template, now_display_fn):
    def dashboard():
        try:
            db = load_fn() or {}
        except Exception as exc:
            return (
                "<!doctype html><html><head><meta charset=utf-8><title>Licence Control</title>"
                "<style>body{font-family:system-ui;background:#07110f;color:#e8f5ee;padding:32px}"
                "a{color:#6ee7b7}</style></head><body>"
                "<h1>SA Invoice Pro · Licence Control</h1>"
                "<p>State store temporarily unavailable.</p>"
                f"<p style='color:#fb7185'>Detail: {type(exc).__name__}</p>"
                "<p><a href='/health'>/health</a> · <a href='/admin'>/admin</a> · "
                "<a href='/admin/billing'>/admin/billing</a> · <a href='/'>Retry</a></p>"
                "</body></html>",
                503,
            )

        if not isinstance(db, dict):
            db = {}
        raw_users = db.get("users") if isinstance(db.get("users"), dict) else {}
        raw_reqs = db.get("requests") if isinstance(db.get("requests"), dict) else {}
        users = [u for u in raw_users.values() if isinstance(u, dict)]
        reqs = [r for r in raw_reqs.values() if isinstance(r, dict)]
        pending = [r for r in reqs if r.get("status") == "pending"]
        issued = [r for r in reqs if r.get("key")]

        def _seen_key(u):
            return str(u.get("lastSeen") or u.get("handshakeAt") or "")

        handshakes = sorted(users, key=_seen_key, reverse=True)
        for user in handshakes:
            try:
                user["raw_json"] = json.dumps(user, indent=2, ensure_ascii=False, default=str)
            except Exception:
                user["raw_json"] = "{}"
        n_licensed = len([u for u in users if u.get("mode") == "licensed"])
        try:
            return render_template_string(
                dash_template,
                handshakes=handshakes,
                pending=pending,
                issued=issued[-30:],
                n_handshake=len(users),
                n_pending=len(pending),
                n_issued=len(issued),
                n_licensed=n_licensed,
                message=request.args.get("msg"),
                now=now_display_fn(),
            )
        except Exception as exc:
            rows = "".join(
                f"<tr><td><code>{(u.get('hwid') or '')}</code></td>"
                f"<td>{(u.get('mode') or '')}</td>"
                f"<td>{(u.get('email') or u.get('company') or '')}</td>"
                f"<td>{(u.get('lastSeen') or '')}</td></tr>"
                for u in handshakes[:100]
            )
            return (
                "<!doctype html><html><head><meta charset=utf-8><title>Licence Control</title>"
                "<style>body{font-family:system-ui;background:#07110f;color:#e8f5ee;padding:24px}"
                "table{border-collapse:collapse;width:100%}td,th{border:1px solid #234;padding:8px;text-align:left}"
                "a{color:#6ee7b7}code{color:#a7f3d0}</style></head><body>"
                "<h1>SA Invoice Pro · Licence Control (safe mode)</h1>"
                f"<p>Template issue: {type(exc).__name__}. Compact table below.</p>"
                f"<p>Devices: {len(users)} · Pending: {len(pending)} · Issued: {len(issued)} · Licensed: {n_licensed}</p>"
                "<p><a href='/admin'>Admin</a> · <a href='/admin/billing'>Billing</a> · <a href='/health'>Health</a></p>"
                f"<table><thead><tr><th>Device</th><th>Mode</th><th>Link</th><th>Last seen</th></tr></thead>"
                f"<tbody>{rows or '<tr><td colspan=4>No devices</td></tr>'}</tbody></table>"
                "</body></html>"
            )

    if "dashboard" in app.view_functions:
        app.view_functions["dashboard"] = dashboard
    else:
        app.add_url_rule("/", endpoint="dashboard", view_func=dashboard, methods=["GET"])
    return app
