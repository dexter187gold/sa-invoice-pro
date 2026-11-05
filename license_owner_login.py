"""Owner browser login for licence control centre.

Uses SA_OWNER_TOKEN (same secret as API X-Owner-Token).
Cookie: saip_owner (signed, httpOnly, Secure when HTTPS).
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone

LOGIN_HTML = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro · Owner login</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;min-height:100vh;display:grid;place-items:center;padding:1rem}
.card{background:#1e293b;border-radius:14px;padding:1.5rem;max-width:400px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35)}
h1{font-size:1.15rem;margin:0 0 .35rem;color:#6ee7b7}
.muted{color:#94a3b8;font-size:.85rem;margin:0 0 1rem}
label{display:block;font-size:.8rem;color:#94a3b8;margin:.5rem 0 .25rem}
input{width:100%;padding:.7rem;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box}
button{margin-top:1rem;width:100%;padding:.75rem;border:0;border-radius:10px;background:#007A4D;color:#fff;font-weight:700;cursor:pointer}
.err{background:#552633;color:#ffe4e6;padding:.6rem .8rem;border-radius:8px;font-size:.85rem;margin-bottom:.75rem}
a{color:#6ee7b7}
</style></head><body>
<div class="card">
  <h1>Owner login</h1>
  <p class="muted">Licence control · enter the same token as <code>SA_OWNER_TOKEN</code> on Render.</p>
  {% if error %}<div class="err">{{ error }}</div>{% endif %}
  <form method="post" action="/login">
    <label>Owner token</label>
    <input type="password" name="token" required autocomplete="current-password" placeholder="SA_OWNER_TOKEN"/>
    <button type="submit">Sign in</button>
  </form>
  <p class="muted" style="margin-top:1rem">After login: <a href="/">Control centre</a> · <a href="/admin">Payment admin</a></p>
</div>
</body></html>
"""


def _secret():
    return (os.environ.get("SA_OWNER_TOKEN") or "").strip()


def _sign(token: str) -> str:
    secret = (os.environ.get("LICENSE_SIGNING_SECRET") or "").strip()
    if len(secret) < 32:
        return ""
    return hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()


def cookie_value_for_token(token: str) -> str:
    t = (token or "").strip()
    return f"{_sign(t)}.{hashlib.sha256(t.encode()).hexdigest()[:16]}"


def token_from_cookie(cookie: str, expected_token: str) -> bool:
    if not cookie or not expected_token:
        return False
    return hmac.compare_digest(cookie, cookie_value_for_token(expected_token))


def register_owner_login(app):
    from flask import request, redirect, make_response, render_template_string

    @app.get("/login")
    def owner_login_get():
        expected = _secret()
        if not expected:
            return render_template_string(
                LOGIN_HTML,
                error="SA_OWNER_TOKEN is not set on this server. Add it in Render Environment.",
            )
        c = request.cookies.get("saip_owner") or ""
        if token_from_cookie(c, expected):
            return redirect("/")
        return render_template_string(LOGIN_HTML, error=None)

    @app.post("/login")
    def owner_login_post():
        expected = _secret()
        got = (request.form.get("token") or "").strip()
        if not expected:
            return render_template_string(
                LOGIN_HTML,
                error="SA_OWNER_TOKEN is not configured on the server.",
            ), 500
        if not got or not hmac.compare_digest(got, expected):
            return render_template_string(LOGIN_HTML, error="Invalid owner token."), 401
        resp = make_response(redirect("/"))
        secure = request.is_secure or request.headers.get("X-Forwarded-Proto") == "https"
        resp.set_cookie(
            "saip_owner",
            cookie_value_for_token(got),
            httponly=True,
            secure=secure,
            samesite="Lax",
            max_age=60 * 60 * 12,
            path="/",
        )
        return resp

    @app.get("/logout")
    def owner_logout():
        resp = make_response(redirect("/login"))
        resp.set_cookie("saip_owner", "", expires=0, path="/")
        return resp

    @app.get("/api/owner/session")
    def owner_session():
        from flask import jsonify
        expected = _secret()
        c = request.cookies.get("saip_owner") or ""
        ok = bool(expected and token_from_cookie(c, expected))
        return jsonify({
            "ok": ok,
            "authenticated": ok,
            "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })

    print("[owner-login] /login /logout /api/owner/session registered")
