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



# ---- Client payment portal (public read, owner publish) ----
PORTALS = os.path.join(BASE, "portals.json")

def load_portals():
    if os.path.exists(PORTALS):
        with open(PORTALS) as f:
            return json.load(f)
    return {}

def save_portals(db):
    with open(PORTALS, "w") as f:
        json.dump(db, f, indent=2)

@app.post("/api/portal/publish")
def portal_publish():
    data = request.get_json(force=True, silent=True) or {}
    token = (data.get("token") or secrets.token_urlsafe(16))[:48]
    payload = data.get("payload") or data
    if not payload.get("client") and not payload.get("invoices"):
        return jsonify({"ok": False, "error": "payload required"}), 400
    # Attach owner PayFast config so public portal can checkout
    try:
        oc = load_owner_config()
        pf = (oc.get("payfast") or {}) if isinstance(oc, dict) else {}
        if pf.get("merchantId") and not (payload.get("payfast") or {}).get("merchantId"):
            payload = dict(payload)
            payload["payfast"] = {
                "merchantId": pf.get("merchantId") or "",
                "merchantKey": pf.get("merchantKey") or "",
                "passphrase": pf.get("passphrase") or "",
                "sandbox": pf.get("sandbox", True),
            }
    except Exception:
        pass
    db = load_portals()
    db[token] = {
        "payload": payload,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "expiresAt": data.get("expiresAt") or (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z",
    }
    save_portals(db)
    return jsonify({"ok": True, "token": token, "urlPath": f"/portal/{token}"})

@app.get("/api/portal/<token>")
def portal_get(token):
    db = load_portals()
    row = db.get(token)
    if not row:
        return jsonify({"ok": False, "error": "Portal not found or expired"}), 404
    exp = row.get("expiresAt")
    if exp:
        try:
            if datetime.fromisoformat(exp.replace("Z", "")) < datetime.utcnow():
                return jsonify({"ok": False, "error": "Portal link expired"}), 410
        except Exception:
            pass
    return jsonify({"ok": True, "payload": row.get("payload") or row})

@app.get("/portal/<token>")
def portal_page(token):
    """Minimal public HTML shell — loads JSON and renders pay buttons client-side."""
    return render_template_string(PORTAL_HTML, token=token)

PORTAL_HTML = r"""
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pay invoices · SA Invoice Pro</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;margin:0;color:#0f172a;min-height:100vh}
.wrap{max-width:520px;margin:0 auto;padding:1rem;padding-bottom:3rem}
.card{background:#fff;border-radius:12px;padding:1rem;margin-bottom:.75rem;border:1px solid #e2e8f0}
h1{font-size:1.15rem;margin:0 0 .35rem}
.muted{color:#64748b;font-size:.85rem}
.btn{display:block;width:100%;padding:.75rem;border:0;border-radius:10px;font-weight:600;margin-top:.5rem;cursor:pointer}
.btn-primary{background:#007A4D;color:#fff}
.btn-outline{background:#fff;border:1px solid #cbd5e1;color:#0f172a}
.row{display:flex;justify-content:space-between;gap:.5rem;font-size:.9rem;padding:.35rem 0;border-bottom:1px solid #f1f5f9}
.badge{font-size:.7rem;background:#ecfdf5;color:#047857;padding:.15rem .4rem;border-radius:6px}
.err{color:#b91c1c}
.bank{font-size:.8rem;line-height:1.45;background:#f8fafc}
</style></head><body>
<div class="wrap" id="app"><p class="muted" style="color:#94a3b8">Loading payment portal…</p></div>
<script>
const TOKEN = {{ token|tojson }};
const API = location.origin + '/api/portal/' + TOKEN;
const CFG_API = location.origin + '/api/public-config';
function money(n){ return 'R '+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}); }

/* Minimal MD5 (PayFast signature) */
function md5(string){
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>32-s),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  function md5cycle(x,k){
    var a=x[0],b=x[1],c=x[2],d=x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);
  }
  function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4)md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return md5blks;}
  function md51(s){
    var n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i;
    for(i=64;i<=n;i+=64)md5cycle(state,md5blk(s.substring(i-64,i)));
    s=s.substring(i-64);var tail=Array(16).fill(0);
    for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);
    tail[i>>2]|=0x80<<((i%4)<<3);
    if(i>55){md5cycle(state,tail);tail=Array(16).fill(0);}
    tail[14]=n*8;md5cycle(state,tail);return state;
  }
  function rhex(n){var j,s='',hex='0123456789abcdef';for(j=0;j<4;j++)s+=hex.charAt((n>>(j*8+4))&0x0F)+hex.charAt((n>>(j*8))&0x0F);return s;}
  function add32(a,b){return (a+b)&0xFFFFFFFF;}
  return md51(string).map(rhex).join('');
}

function buildSignature(data, passphrase){
  const keys = Object.keys(data).filter(k => k !== 'signature' && data[k] !== '' && data[k] != null);
  // PayFast attribute order as submitted — use insertion order of our object
  let str = keys.map(k => k + '=' + encodeURIComponent(String(data[k]).trim()).replace(/%20/g,'+')).join('&');
  if(passphrase) str += '&passphrase=' + encodeURIComponent(passphrase.trim()).replace(/%20/g,'+');
  return md5(str);
}

function postPayFast(pf, fields){
  const sandbox = pf.sandbox !== false && pf.sandbox !== 'false' && pf.sandbox !== 0;
  const action = sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  Object.keys(fields).forEach(k => {
    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = k;
    inp.value = fields[k];
    form.appendChild(inp);
  });
  document.body.appendChild(form);
  form.submit();
}

async function load(){
  const el = document.getElementById('app');
  try{
    const r = await fetch(API, {cache:'no-store'});
    const j = await r.json();
    if(!j.ok) throw new Error(j.error||'Portal not found');
    const p = j.payload||{};
    const co = p.company||{};
    const cl = p.client||{};
    let pf = Object.assign({}, p.payfast||{});
    // Merge owner public-config if portal payload missing merchant
    if(!pf.merchantId){
      try{
        const cr = await fetch(CFG_API, {cache:'no-store'});
        const cj = await cr.json();
        if(cj && cj.payfast && cj.payfast.merchantId){
          pf = Object.assign({}, cj.payfast);
        }
      }catch(e){}
    }
    const inv = (p.invoices||[]).filter(i=>!['paid','cancelled'].includes(String(i.status||'').toLowerCase()));
    const allOpen = inv.reduce((s,i)=>s+Number(i.amountDue!=null?i.amountDue:i.total||0),0);
    const bankBits = [co.bankName, co.accountNumber && ('Acc '+co.accountNumber), co.branchCode && ('Branch '+co.branchCode)].filter(Boolean).join(' · ');

    let html = `<div class="card"><h1>${co.name||'Invoices'}</h1>
      <p class="muted">For ${cl.name||'client'}${cl.email?' · '+cl.email:''}</p></div>`;
    if(!inv.length){
      html += `<div class="card"><p>No open invoices.</p></div>`;
    } else {
      inv.forEach(i=>{
        const due = Number(i.amountDue!=null?i.amountDue:i.total||0);
        html += `<div class="card">
          <div class="row"><strong>${i.number||i.id}</strong><span class="badge">${i.status||'unpaid'}</span></div>
          <div class="row"><span>Amount due</span><strong>${money(due)}</strong></div>
          <div class="row"><span>Due</span><span>${i.dueDate||'—'}</span></div>
          <button type="button" class="btn btn-primary" data-pay="${i.id}" data-amt="${due}" data-num="${String(i.number||i.id).replace(/"/g,'')}">Pay this invoice</button>
        </div>`;
      });
      if(inv.length>1){
        html += `<div class="card"><div class="row"><strong>All open</strong><strong>${money(allOpen)}</strong></div>
          <button type="button" class="btn btn-outline" id="pay-all" data-amt="${allOpen}">Pay all open invoices</button></div>`;
      }
    }
    if(bankBits){
      html += `<div class="card bank"><strong>EFT / bank deposit</strong><br>${bankBits}<br>Reference: your invoice number</div>`;
    }
    if(!pf.merchantId){
      html += `<div class="card"><p class="muted">Online card/Instant EFT is not enabled yet. Use EFT details above or contact the business.</p></div>`;
    }
    html += `<p class="muted" style="text-align:center;color:#94a3b8">Powered by SA Invoice Pro · PayFast when configured</p>`;
    el.innerHTML = html;

    window.__portalPay = async (amt, ref) => {
      amt = Number(amt);
      if(!(amt>0)){ alert('Invalid amount'); return; }
      if(p.payLinks && p.payLinks[ref]){
        location.href = p.payLinks[ref];
        return;
      }
      if(!pf.merchantId || !pf.merchantKey){
        alert('Online payment is not enabled. Please pay by EFT using the bank details on this page (or your invoice), reference '+ref+', or contact '+(co.name||'the business')+'.');
        return;
      }
      const returnBase = location.origin + location.pathname;
      const data = {
        merchant_id: String(pf.merchantId).trim(),
        merchant_key: String(pf.merchantKey).trim(),
        return_url: returnBase + (returnBase.indexOf('?')>=0?'&':'?') + 'paid=1&ref=' + encodeURIComponent(ref),
        cancel_url: returnBase + (returnBase.indexOf('?')>=0?'&':'?') + 'cancel=1&ref=' + encodeURIComponent(ref),
        name_first: String((cl.name||'Client').split(/\s+/)[0]||'Client').slice(0,100),
        name_last: String((cl.name||'').split(/\s+/).slice(1).join(' ')||'Customer').slice(0,100),
        email_address: String(cl.email||'').slice(0,100),
        m_payment_id: String('P-'+ref+'-'+Date.now().toString(36)).slice(0,100),
        amount: amt.toFixed(2),
        item_name: String('Invoice '+ref).slice(0,100),
        item_description: String((co.name||'')+' — '+(cl.name||'')).slice(0,255)
      };
      Object.keys(data).forEach(k => { if(data[k]===''||data[k]==null) delete data[k]; });
      data.signature = buildSignature(data, pf.passphrase||'');
      postPayFast(pf, data);
    };
    el.querySelectorAll('[data-pay]').forEach(btn=>{
      btn.onclick = () => window.__portalPay(btn.dataset.amt, btn.dataset.num);
    });
    const all = document.getElementById('pay-all');
    if(all) all.onclick = () => window.__portalPay(all.dataset.amt, 'BULK-'+TOKEN.slice(0,8));
  }catch(e){
    el.innerHTML = '<div class="card err">'+(e.message||e)+'</div>';
  }
}
load();
</script>
</body></html>
"""





# ---- Owner remote config (Google + PayFast pushed to all clients) ----
CONFIG_FILE = os.path.join(BASE, "owner_config.json")
OWNER_TOKEN = os.environ.get("SA_OWNER_TOKEN", "sa-owner-2026")

def load_owner_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {
        "googleClientId": "",
        "payfast": {
            "merchantId": "",
            "merchantKey": "",
            "passphrase": "",
            "sandbox": True
        },
        "licenseServerUrl": "",
        "updatedAt": None
    }

def save_owner_config(cfg):
    cfg["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)

@app.get("/api/public-config")
def public_config():
    """Clients pull this on startup — no auth (only non-secret or owner-chosen secrets for sandbox)."""
    cfg = load_owner_config()
    return jsonify({
        "ok": True,
        "googleClientId": cfg.get("googleClientId") or "",
        "payfast": cfg.get("payfast") or {},
        "licenseServerUrl": cfg.get("licenseServerUrl") or "",
        "updatedAt": cfg.get("updatedAt")
    })

@app.get("/admin")
def admin_page():
    cfg = load_owner_config()
    pf = cfg.get("payfast") or {}
    return render_template_string(ADMIN_HTML, cfg=cfg, pf=pf, token_hint="SA_OWNER_TOKEN env or sa-owner-2026")

@app.post("/admin/save")
def admin_save():
    token = request.form.get("token") or ""
    if token != OWNER_TOKEN:
        return "Unauthorized — wrong owner token", 401
    cfg = load_owner_config()
    cfg["googleClientId"] = (request.form.get("googleClientId") or "").strip()
    cfg["licenseServerUrl"] = (request.form.get("licenseServerUrl") or "").strip().rstrip("/")
    cfg["payfast"] = {
        "merchantId": (request.form.get("merchantId") or "").strip(),
        "merchantKey": (request.form.get("merchantKey") or "").strip(),
        "passphrase": (request.form.get("passphrase") or "").strip(),
        "sandbox": request.form.get("sandbox") == "on"
    }
    save_owner_config(cfg)
    return redirect("/admin?saved=1")

ADMIN_HTML = r"""
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SA Invoice Pro – Admin</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:1rem}
.wrap{max-width:560px;margin:0 auto}
.card{background:#1e293b;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
h1{font-size:1.2rem;margin:0 0 .5rem;color:#6ee7b7}
label{display:block;font-size:.8rem;color:#94a3b8;margin:.6rem 0 .25rem}
input[type=text],input[type=password]{width:100%;padding:.6rem;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box}
button{margin-top:1rem;width:100%;padding:.75rem;border:0;border-radius:10px;background:#007A4D;color:#fff;font-weight:700;cursor:pointer}
.muted{font-size:.8rem;color:#94a3b8}
.ok{color:#6ee7b7}
</style></head><body>
<div class="wrap">
  <div class="card">
    <h1>Admin portal</h1>
    <p class="muted">Push Google Sign-In Client ID and PayFast credentials to all app users. Clients fetch <code>/api/public-config</code> on startup.</p>
    <p class="muted">After save, users pick up config on next app launch.</p>
    <form method="post" action="/admin/save">
      <label>Owner token</label>
      <input type="password" name="token" placeholder="{{ token_hint }}" required/>
      <label>Google OAuth Web Client ID</label>
      <input type="text" name="googleClientId" value="{{ cfg.googleClientId or '' }}" placeholder="….apps.googleusercontent.com"/>
      <label>Public license server URL (optional)</label>
      <input type="text" name="licenseServerUrl" value="{{ cfg.licenseServerUrl or '' }}" placeholder="https://your-license.onrender.com"/>
      <label>PayFast Merchant ID</label>
      <input type="text" name="merchantId" value="{{ pf.merchantId or '' }}"/>
      <label>PayFast Merchant Key</label>
      <input type="text" name="merchantKey" value="{{ pf.merchantKey or '' }}"/>
      <label>PayFast Passphrase</label>
      <input type="password" name="passphrase" value="{{ pf.passphrase or '' }}"/>
      <label><input type="checkbox" name="sandbox" {% if pf.sandbox != False %}checked{% endif %}/> Sandbox mode</label>
      <button type="submit">Save &amp; push to clients</button>
    </form>
  </div>
  <p class="muted">Open this page at <code>/admin</code> on your license server host. Set env <code>SA_OWNER_TOKEN</code> in production.</p>
</div>
</body></html>
"""


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
    port = int(__import__("os").environ.get("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
