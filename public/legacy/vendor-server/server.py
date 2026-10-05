#!/usr/bin/env python3
"""SA Invoice Pro – Vendor License Server v1.5 (handshake + validate)"""
from flask import Flask, request, jsonify, render_template_string, redirect, url_for
from datetime import datetime, timedelta
import json, os, secrets, string, sys

app = Flask(__name__)

def app_root():
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

BASE = app_root()
DATA = os.path.join(BASE, "users.json")
SECRET = "SAIP-ZA-2026-V1"

def load():
    if os.path.exists(DATA):
        with open(DATA) as f:
            return json.load(f)
    return {"users": {}, "requests": {}, "keys": {}}

def save(db):
    with open(DATA, "w") as f:
        json.dump(db, f, indent=2)

def checksum_js(body: str) -> str:
    s = body + SECRET
    h = 0
    for ch in s:
        h = ((h << 5) - h + ord(ch))
        h = h % (2**32)
        if h >= 2**31:
            h -= 2**32
    n = abs(h)
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        out = "0"
    else:
        out = ""
        while n:
            n, r = divmod(n, 36)
            out = chars[r] + out
    return out.upper().zfill(4)[-4:]

def gen_key(plan_code="T"):
    code = (plan_code or "T")[0].upper()
    alphabet = string.ascii_uppercase + string.digits
    def chunk():
        return "".join(secrets.choice(alphabet) for _ in range(4))
    p1 = code + chunk()[1:]
    p2 = chunk()
    return f"SAIP-{p1}-{p2}-{checksum_js(p1 + p2)}"

PLAN_DAYS = {"T": 7, "S": 365, "P": 730, "E": 36500, "L": 36500}
PLAN_LABEL = {
    "T": "Server trial (7 days)",
    "S": "Standard (1 Year)",
    "P": "Professional (2 Years)",
    "E": "Enterprise",
    "L": "Lifetime",
}

DASH = r'''
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>SA Invoice – License Server</title>
<style>
:root{--green:#007A4D;--navy:#0f172a;--bg:#f1f5f9;--card:#fff;--border:#e2e8f0}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:#0f172a}
header{background:var(--navy);color:#fff;padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center}
header h1{margin:0;font-size:1.1rem}main{max-width:1100px;margin:1.25rem auto;padding:0 1rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.1rem;margin-bottom:1rem}
.card h2{margin:0 0 .6rem;font-size:1rem;color:var(--green)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th,td{border-bottom:1px solid var(--border);padding:.45rem;text-align:left;vertical-align:top}
th{font-size:.7rem;text-transform:uppercase;color:#64748b}
code{background:#f1f5f9;padding:.1rem .3rem;border-radius:4px;font-size:.78rem}
.btn{border:none;border-radius:8px;padding:.4rem .7rem;font-weight:600;cursor:pointer;font-size:.78rem;color:#fff;background:var(--green);margin:.12rem}
.btn.sec{background:#334155}.btn.blue{background:#2563eb}.btn.warn{background:#b45309}
.badge{display:inline-block;padding:.1rem .4rem;border-radius:999px;font-size:.68rem;font-weight:600}
.badge.pending{background:#fef3c7;color:#92400e}.badge.issued{background:#d1fae5;color:#065f46}
.badge.handshake{background:#e0e7ff;color:#3730a3}.badge.licensed{background:#d1fae5;color:#065f46}
.stats{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem}
.stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:.85rem 1rem;min-width:110px}
.stat b{display:block;font-size:1.3rem;color:var(--green)}
.flash{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:.65rem 1rem;border-radius:8px;margin-bottom:1rem}
.muted{color:#64748b;font-size:.8rem}form.inline{display:inline}
</style></head><body>
<header>
  <div><h1>SA Invoice Pro – License Server</h1><span style="opacity:.8;font-size:.85rem">Handshake · Issue · Validate · Creator only</span></div>
  <span>{{ now }}</span>
</header>
<main>
{% if message %}<div class="flash">{{ message }}</div>{% endif %}
<div class="stats">
  <div class="stat"><b>{{ n_handshake }}</b>Handshakes</div>
  <div class="stat"><b>{{ n_pending }}</b>Pending requests</div>
  <div class="stat"><b>{{ n_issued }}</b>Keys issued</div>
  <div class="stat"><b>{{ n_licensed }}</b>Activated</div>
</div>

<div class="card">
  <h2>1. Device handshakes (Get HWID from clients)</h2>
  <p class="muted">Client pressed Get HWID – server acknowledged the device.</p>
  <table>
    <tr><th>HW ID</th><th>Status</th><th>Version</th><th>Last seen</th></tr>
    {% for u in handshakes %}
    <tr>
      <td><code>{{ u.hwid }}</code></td>
      <td><span class="badge handshake">{{ u.mode or 'handshake' }}</span></td>
      <td>{{ u.appVersion or '—' }}</td>
      <td class="muted">{{ u.lastSeen }}</td>
    </tr>
    {% else %}
    <tr><td colspan="4" class="muted">Waiting for client Get HWID…</td></tr>
    {% endfor %}
  </table>
</div>

<div class="card">
  <h2>2. License requests – approve to generate encrypted key</h2>
  <table>
    <tr><th>HW ID</th><th>Company</th><th>Asked</th><th>When</th><th>Issue key</th></tr>
    {% for r in pending %}
    <tr>
      <td><code>{{ r.hwid }}</code></td>
      <td>{{ r.company or '—' }}</td>
      <td>{{ r.plan }}</td>
      <td class="muted">{{ r.at }}</td>
      <td>
        <form class="inline" method="post" action="/issue">
          <input type="hidden" name="hwid" value="{{ r.hwid }}"/>
          <button class="btn" name="plan" value="T">7-day trial</button>
          <button class="btn blue" name="plan" value="S">Standard</button>
          <button class="btn sec" name="plan" value="P">Pro</button>
          <button class="btn warn" name="plan" value="L">Lifetime</button>
        </form>
      </td>
    </tr>
    {% else %}
    <tr><td colspan="5" class="muted">No pending requests</td></tr>
    {% endfor %}
  </table>
</div>

<div class="card">
  <h2>3. Issued keys & activations</h2>
  <table>
    <tr><th>HW ID</th><th>Status</th><th>Plan</th><th>Key</th><th>Activated</th></tr>
    {% for r in issued %}
    <tr>
      <td><code>{{ r.hwid }}</code></td>
      <td><span class="badge issued">{{ r.status }}</span></td>
      <td>{{ r.plan }}</td>
      <td><code>{{ r.key }}</code></td>
      <td class="muted">{{ r.activatedAt or '—' }}</td>
    </tr>
    {% else %}
    <tr><td colspan="5" class="muted">None yet</td></tr>
    {% endfor %}
  </table>
</div>

<div class="card">
  <h2>4. Control connected devices (change status)</h2>
  <p class="muted">Suspended / blocked devices cannot activate or use licensed features once they check in.</p>
  <table>
    <tr><th>HW ID</th><th>Current</th><th>Last seen</th><th>Set status</th></tr>
    {% for u in handshakes %}
    <tr>
      <td><code>{{ u.hwid }}</code></td>
      <td><span class="badge">{{ u.mode }}</span></td>
      <td class="muted">{{ u.lastSeen }}</td>
      <td>
        <form class="inline" method="post" action="/set-status">
          <input type="hidden" name="hwid" value="{{ u.hwid }}"/>
          <button class="btn" name="status" value="licensed">Licensed</button>
          <button class="btn blue" name="status" value="trial">Trial</button>
          <button class="btn warn" name="status" value="suspended">Suspend</button>
          <button class="btn sec" name="status" value="blocked">Block</button>
        </form>
      </td>
    </tr>
    {% else %}
    <tr><td colspan="4" class="muted">No devices yet</td></tr>
    {% endfor %}
  </table>
</div>
</main></body></html>
'''


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/api/<path:path>", methods=["OPTIONS"])
@app.route("/api/handshake", methods=["OPTIONS"])
@app.route("/api/request", methods=["OPTIONS"])
@app.route("/api/claim", methods=["OPTIONS"])
@app.route("/api/activate-validate", methods=["OPTIONS"])
@app.route("/api/heartbeat", methods=["OPTIONS"])
def cors_preflight(path=None):
    return ("", 204)

@app.get("/")
def dashboard():
    db = load()
    users = list(db.get("users", {}).values())
    reqs = list(db.get("requests", {}).values())
    pending = [r for r in reqs if r.get("status") == "pending"]
    issued = [r for r in reqs if r.get("key")]
    handshakes = sorted(users, key=lambda x: x.get("lastSeen", ""), reverse=True)[:40]
    n_licensed = len([u for u in users if u.get("mode") == "licensed"])
    return render_template_string(
        DASH,
        handshakes=handshakes,
        pending=pending,
        issued=issued[-30:],
        n_handshake=len(users),
        n_pending=len(pending),
        n_issued=len(issued),
        n_licensed=n_licensed,
        message=request.args.get("msg"),
        now=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    )

@app.post("/issue")
def issue():
    hwid = (request.form.get("hwid") or "").strip()
    plan = (request.form.get("plan") or "T").strip().upper()[:1]
    if not hwid:
        return redirect(url_for("dashboard", msg="HW ID required"))
    key = gen_key(plan)
    db = load()
    reqs = db.setdefault("requests", {})
    prev = reqs.get(hwid, {})
    reqs[hwid] = {
        **prev,
        "hwid": hwid,
        "plan": plan,
        "key": key,
        "status": "issued",
        "issuedAt": datetime.utcnow().isoformat() + "Z",
        "company": prev.get("company", ""),
    }
    db.setdefault("keys", {})[key] = {
        "hwid": hwid,
        "plan": plan,
        "days": PLAN_DAYS.get(plan, 7),
        "label": PLAN_LABEL.get(plan, "Licensed"),
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "used": False,
    }
    save(db)
    return redirect(url_for("dashboard", msg=f"Issued {plan} key for {hwid}"))

@app.post("/api/handshake")
def api_handshake():
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid")
    if not hwid:
        return jsonify({"error": "hwid required"}), 400
    db = load()
    users = db.setdefault("users", {})
    users[hwid] = {
        **users.get(hwid, {}),
        "hwid": hwid,
        "mode": users.get(hwid, {}).get("mode") or "handshake",
        "appVersion": data.get("appVersion"),
        "lastSeen": datetime.utcnow().isoformat() + "Z",
        "handshakeAt": datetime.utcnow().isoformat() + "Z",
    }
    # If key already issued, return it
    req = db.get("requests", {}).get(hwid) or {}
    out = {
        "ok": True,
        "message": "Handshake successful – device registered on server",
        "hwid": hwid,
    }
    if req.get("key") and req.get("status") in ("issued", "claimed", "activated"):
        out["key"] = req["key"]
        out["status"] = req["status"]
    save(db)
    return jsonify(out)

@app.post("/api/request")
def api_request():
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid")
    if not hwid:
        return jsonify({"error": "hwid required"}), 400
    db = load()
    # Must have handshake first
    user = db.get("users", {}).get(hwid)
    if not user:
        return jsonify({"error": "Handshake required first – click Get HWID on client"}), 400
    reqs = db.setdefault("requests", {})
    existing = reqs.get(hwid)
    if existing and existing.get("key"):
        return jsonify({
            "ok": True,
            "status": "already_issued",
            "message": "Key already issued – use Claim / key will appear",
            "key": existing["key"],
        })
    reqs[hwid] = {
        "hwid": hwid,
        "plan": data.get("plan") or "T",
        "company": data.get("company") or "",
        "appVersion": data.get("appVersion"),
        "at": data.get("at") or datetime.utcnow().isoformat() + "Z",
        "status": "pending",
        "key": None,
    }
    users = db.setdefault("users", {})
    users[hwid] = {**users.get(hwid, {}), "mode": "pending_request", "lastSeen": datetime.utcnow().isoformat() + "Z"}
    save(db)
    return jsonify({"ok": True, "status": "pending", "message": "Request received – vendor must issue a key on the server"})

@app.post("/api/claim")
def api_claim():
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid")
    if not hwid:
        return jsonify({"error": "hwid required"}), 400
    db = load()
    req = db.get("requests", {}).get(hwid)
    if not req or not req.get("key"):
        return jsonify({"error": "No key issued yet", "message": "Vendor has not approved this request"}), 404
    req["status"] = "claimed"
    req["claimedAt"] = datetime.utcnow().isoformat() + "Z"
    save(db)
    return jsonify({"ok": True, "key": req["key"], "plan": req.get("plan"), "status": "claimed"})

@app.post("/api/activate-validate")
def api_activate_validate():
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid")
    key = (data.get("key") or "").strip().upper()
    if not hwid or not key:
        return jsonify({"valid": False, "error": "hwid and key required"}), 400
    db = load()
    key_rec = db.get("keys", {}).get(key)
    req = db.get("requests", {}).get(hwid)
    # Key must exist on server and match this HWID
    if not key_rec and req and req.get("key") == key:
        key_rec = {
            "hwid": hwid,
            "plan": req.get("plan") or "T",
            "days": PLAN_DAYS.get(req.get("plan") or "T", 7),
            "label": PLAN_LABEL.get(req.get("plan") or "T", "Licensed"),
        }
    if not key_rec:
        return jsonify({"valid": False, "error": "Unknown key – only server-issued keys are valid"}), 400
    if key_rec.get("hwid") and key_rec["hwid"] != hwid:
        return jsonify({"valid": False, "error": "Key was issued for a different device"}), 400
    if req and req.get("key") and req["key"] != key:
        return jsonify({"valid": False, "error": "Key does not match issued key for this device"}), 400

    plan = key_rec.get("plan") or "T"
    days = int(key_rec.get("days") or PLAN_DAYS.get(plan, 7))
    expires = (datetime.utcnow() + timedelta(days=days)).isoformat() + "Z"
    # Mark activated
    if key in db.get("keys", {}):
        db["keys"][key]["used"] = True
        db["keys"][key]["activatedAt"] = datetime.utcnow().isoformat() + "Z"
    if req:
        req["status"] = "activated"
        req["activatedAt"] = datetime.utcnow().isoformat() + "Z"
    users = db.setdefault("users", {})
    users[hwid] = {
        **users.get(hwid, {}),
        "hwid": hwid,
        "mode": "licensed",
        "plan": plan,
        "key": key,
        "lastSeen": datetime.utcnow().isoformat() + "Z",
        "activatedAt": datetime.utcnow().isoformat() + "Z",
    }
    save(db)
    return jsonify({
        "valid": True,
        "message": "Activation successful",
        "plan": plan,
        "days": days,
        "label": key_rec.get("label") or PLAN_LABEL.get(plan, "Licensed"),
        "expiresAt": expires,
    })

@app.post("/api/heartbeat")
def heartbeat():
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid") or "unknown"
    db = load()
    users = db.setdefault("users", {})
    users[hwid] = {
        **users.get(hwid, {}),
        "hwid": hwid,
        "mode": data.get("mode") or users.get(hwid, {}).get("mode"),
        "plan": data.get("plan"),
        "appVersion": data.get("appVersion"),
        "lastSeen": datetime.utcnow().isoformat() + "Z",
    }
    save(db)
    return jsonify({"ok": True})



@app.post("/set-status")
def set_status_form():
    return api_set_status()

@app.post("/api/set-status")
def api_set_status():
    """JSON from automation OR form from dashboard."""
    if request.is_json:
        data = request.get_json(force=True, silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        status = (data.get("status") or "").strip().lower()
    else:
        hwid = (request.form.get("hwid") or "").strip()
        status = (request.form.get("status") or "").strip().lower()
    allowed = {"handshake", "pending_request", "licensed", "suspended", "blocked", "trial", "expired"}
    if not hwid or status not in allowed:
        if request.is_json:
            return jsonify({"error": "hwid and valid status required"}), 400
        return redirect(url_for("dashboard", msg="Invalid status"))
    db = load()
    users = db.setdefault("users", {})
    users[hwid] = {
        **users.get(hwid, {}),
        "hwid": hwid,
        "mode": status,
        "statusSetAt": datetime.utcnow().isoformat() + "Z",
        "lastSeen": users.get(hwid, {}).get("lastSeen") or datetime.utcnow().isoformat() + "Z",
    }
    save(db)
    if request.is_json:
        return jsonify({"ok": True, "hwid": hwid, "mode": status})
    return redirect(url_for("dashboard", msg=f"Status for {hwid} → {status}"))

@app.post("/api/device-status")
def api_device_status():
    """Client asks: am I suspended/blocked?"""
    data = request.get_json(force=True, silent=True) or {}
    hwid = data.get("hwid")
    if not hwid:
        return jsonify({"error": "hwid required"}), 400
    db = load()
    u = db.get("users", {}).get(hwid) or {}
    mode = u.get("mode") or "unknown"
    return jsonify({
        "ok": True,
        "hwid": hwid,
        "mode": mode,
        "allowed": mode not in ("suspended", "blocked"),
        "message": u.get("adminNote") or ""
    })


def free_port(port=5055):
    """Kill any process listening on port (Windows / Unix)."""
    import subprocess
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(
                f'netstat -ano | findstr ":{port} "',
                shell=True, text=True, stderr=subprocess.DEVNULL
            )
            pids = set()
            for line in out.splitlines():
                if "LISTENING" in line.upper():
                    parts = line.split()
                    if parts:
                        pids.add(parts[-1])
            for pid in pids:
                if pid.isdigit() and int(pid) != os.getpid():
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        else:
            out = subprocess.check_output(["lsof", "-ti", f":{port}"], text=True)
            for pid in out.split():
                if pid.isdigit() and int(pid) != os.getpid():
                    subprocess.run(["kill", "-9", pid], capture_output=True)
    except Exception:
        pass

if __name__ == "__main__":
    import webbrowser, threading, time
    def open_browser():
        time.sleep(1.0)
        webbrowser.open("http://127.0.0.1:5055/")
    free_port(5055)
    print("=" * 50)
    print("  SA Invoice Pro – License Server v1.5")
    print("  http://127.0.0.1:5055/")
    print("  Data:", DATA)
    print("=" * 50)
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(host="0.0.0.0", port=5055, debug=False, use_reloader=False)
