#!/usr/bin/env python3
"""
Owner SaaS-style dashboard (host this on a VPS for "cloud").
Combines license metrics + update publish status on port 5060.
Deploy: python owner_saas_dashboard.py
Cloud: put behind nginx + HTTPS on your domain.
"""
from flask import Flask, jsonify, render_template_string, request
from datetime import datetime
import json, os, sys

app = Flask(__name__)

def root():
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

BASE = root()
USERS = os.path.join(BASE, "users.json")
VER = os.path.join(BASE, "version.json")

def load_users():
    if os.path.exists(USERS):
        with open(USERS) as f:
            return json.load(f)
    return {"users": {}, "requests": {}, "keys": {}}

def load_ver():
    if os.path.exists(VER):
        with open(VER) as f:
            return json.load(f)
    return {"version": "?", "downloadUrl": ""}

@app.after_request
def cors(r):
    r.headers["Access-Control-Allow-Origin"] = "*"
    return r

DASH = """
<!doctype html><html><head><title>SA Invoice – Owner Cloud Dashboard</title>
<style>
body{font-family:system-ui;margin:0;background:#0f172a;color:#e2e8f0}
header{padding:1.25rem 1.5rem;background:#007A4D}
main{max-width:1100px;margin:1.5rem auto;padding:0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem}
.card{background:#1e293b;border-radius:12px;padding:1rem}
.card b{font-size:1.6rem;display:block;color:#34d399}
table{width:100%;border-collapse:collapse;font-size:.85rem}
td,th{padding:.45rem;border-bottom:1px solid #334155;text-align:left}
a{color:#6ee7b7}
</style></head><body>
<header><h1 style="margin:0;font-size:1.2rem">SA Invoice Pro – Owner dashboard</h1>
<p style="margin:.35rem 0 0;opacity:.9">Trials · paid · devices · update channel · host on any VPS for cloud mode</p></header>
<main>
<div class="grid">
  <div class="card"><b>{{ n_users }}</b>Devices seen</div>
  <div class="card"><b>{{ n_licensed }}</b>Licensed / activated</div>
  <div class="card"><b>{{ n_pending }}</b>Pending requests</div>
  <div class="card"><b>{{ n_trial }}</b>Trial-ish</div>
  <div class="card"><b>{{ n_blocked }}</b>Suspended / blocked</div>
</div>
<div class="card" style="margin-top:1rem">
  <h2 style="font-size:1rem">Update channel</h2>
  <p>Published version: <strong>{{ ver.version }}</strong></p>
  <p style="font-size:.85rem;word-break:break-all">{{ ver.downloadUrl or 'No downloadUrl' }}</p>
</div>
<div class="card" style="margin-top:1rem">
  <h2 style="font-size:1rem">Recent devices</h2>
  <table>
    <tr><th>HWID</th><th>Mode</th><th>Plan</th><th>Last seen</th></tr>
    {% for u in recent %}
    <tr><td><code>{{ u.hwid }}</code></td><td>{{ u.mode }}</td><td>{{ u.plan or '—' }}</td><td>{{ u.lastSeen }}</td></tr>
    {% else %}
    <tr><td colspan="4">No data – run license_server.py so users.json fills</td></tr>
    {% endfor %}
  </table>
</div>
<p style="font-size:.8rem;color:#94a3b8;margin-top:1.5rem">
Cloud deploy: copy this folder to a VPS, open ports 5055 (license), 5056 (updates), 5060 (this dashboard), put nginx TLS in front.
API: <a href="/api/stats">/api/stats</a>
</p>
</main></body></html>
"""

@app.get("/")
def home():
    db = load_users()
    users = list(db.get("users", {}).values())
    reqs = list(db.get("requests", {}).values())
    n_licensed = len([u for u in users if u.get("mode") in ("licensed", "activated")])
    n_trial = len([u for u in users if (u.get("plan") or "").upper().startswith("T") or u.get("mode") == "trial"])
    n_blocked = len([u for u in users if u.get("mode") in ("blocked", "suspended")])
    n_pending = len([r for r in reqs if r.get("status") == "pending"])
    recent = sorted(users, key=lambda x: x.get("lastSeen") or "", reverse=True)[:40]
    return render_template_string(
        DASH,
        n_users=len(users),
        n_licensed=n_licensed,
        n_trial=n_trial,
        n_blocked=n_blocked,
        n_pending=n_pending,
        recent=recent,
        ver=load_ver(),
    )

@app.get("/api/stats")
def stats():
    db = load_users()
    users = list(db.get("users", {}).values())
    return jsonify({
        "devices": len(users),
        "byMode": {},
        "users": users[-50:],
        "version": load_ver(),
        "generatedAt": datetime.utcnow().isoformat() + "Z",
    })

if __name__ == "__main__":
    print("Owner dashboard http://127.0.0.1:5060/")
    port = int(__import__("os").environ.get("PORT", "5060"))
    app.run(host="0.0.0.0", port=port, debug=False)
