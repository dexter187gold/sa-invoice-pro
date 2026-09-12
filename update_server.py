#!/usr/bin/env python3
"""SA Invoice Pro – Update push server (owner). Port 5056.
Serve ZIPs from ./releases/ so clients need no external download host.
"""
from flask import Flask, jsonify, request, send_from_directory, render_template_string, abort
from datetime import datetime
import json, os, sys

app = Flask(__name__)

def root():
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

BASE = root()
VER_FILE = os.path.join(BASE, "version.json")
RELEASES = os.path.join(BASE, "releases")
os.makedirs(RELEASES, exist_ok=True)

def load_ver():
    if os.path.exists(VER_FILE):
        with open(VER_FILE) as f:
            return json.load(f)
    return {
        "version": "2.0.2",
        "minVersion": "1.0.0",
        "message": "Update available",
        "mandatory": False,
        "downloadUrl": "",
        "releasedAt": datetime.utcnow().isoformat() + "Z",
        "changelog": []
    }

def save_ver(d):
    with open(VER_FILE, "w") as f:
        json.dump(d, f, indent=2)

def list_zips():
    if not os.path.isdir(RELEASES):
        return []
    return [n for n in sorted(os.listdir(RELEASES)) if n.lower().endswith(".zip")]

@app.after_request
def cors(r):
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return r

@app.route("/api/<path:p>", methods=["OPTIONS"])
def opt(p=None):
    return ("", 204)

@app.get("/api/latest")
def latest():
    return jsonify(load_ver())

@app.get("/api/releases")
def api_releases():
    files = []
    for name in list_zips():
        fp = os.path.join(RELEASES, name)
        files.append({
            "name": name,
            "size": os.path.getsize(fp),
            "url": "/releases/" + name,
        })
    return jsonify({"releases": files, "folder": RELEASES})

@app.get("/releases/")
@app.get("/releases")
def releases_index():
    zips = list_zips()
    links = "".join(
        f'<li><a href="/releases/{z}">{z}</a> '
        f'(<code>http://127.0.0.1:5056/releases/{z}</code>)</li>'
        for z in zips
    ) or "<li><em>No .zip files yet — copy a zip into the releases folder</em></li>"
    return f"""<!doctype html><html><body style="font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 1rem">
    <h1>Releases</h1>
    <p>Folder: <code>{RELEASES}</code></p>
    <ul>{links}</ul>
    <p><a href="/">← Back to publish page</a></p>
    </body></html>"""

@app.get("/releases/<path:filename>")
def download_release(filename):
    safe = os.path.basename(filename)
    path = os.path.join(RELEASES, safe)
    if not os.path.isfile(path):
        return (
            f"<h1>File not found</h1>"
            f"<p>Missing: <code>{safe}</code></p>"
            f"<p>Put the zip here on the server PC:</p>"
            f"<pre>{RELEASES}</pre>"
            f"<p>Files currently present: {list_zips() or '(none)'}</p>"
            f'<p><a href="/releases">List releases</a></p>',
            404,
        )
    return send_from_directory(RELEASES, safe, as_attachment=True)

@app.post("/api/publish")
def publish():
    data = request.get_json(force=True, silent=True) or {}
    token = data.get("token") or ""
    if token != os.environ.get("SA_OWNER_TOKEN", "sa-owner-2026"):
        return jsonify({"error": "unauthorized"}), 401
    ver = load_ver()
    for k in ("version", "message", "mandatory", "downloadUrl", "changelog", "minVersion"):
        if k in data:
            ver[k] = data[k]
    ver["releasedAt"] = datetime.utcnow().isoformat() + "Z"
    save_ver(ver)
    return jsonify({"ok": True, "version": ver})

DASH = r"""
<!doctype html><html><head><title>Update Server</title>
<style>
body{font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem;background:#f8fafc}
input{width:100%;padding:.5rem;margin:.3rem 0;box-sizing:border-box}
button{background:#007A4D;color:#fff;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer}
code{background:#e2e8f0;padding:.15rem .35rem;border-radius:4px;font-size:.85rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-top:1rem}
.ok{color:#065f46}.err{color:#991b1b}
</style></head><body>
<h1>SA Invoice – Update Server</h1>
<p>Status: <strong class="ok">running</strong> · Current version tag: <strong>{{ v.version }}</strong></p>
<p>Open these to test:</p>
<ul>
  <li><a href="/api/latest">/api/latest</a> (JSON clients poll)</li>
  <li><a href="/releases">/releases</a> (list ZIP files)</li>
</ul>

<form method="post" action="/publish-form">
<label>Version</label><input name="version" value="{{ v.version }}"/>
<label>Message</label><input name="message" value="{{ v.message }}"/>
<label>Download URL (ZIP)</label>
<input name="downloadUrl" value="{{ v.downloadUrl or default_url }}" placeholder="http://127.0.0.1:5056/releases/sa-invoice-v2.0.2.zip"/>
<label>Mandatory (true/false)</label><input name="mandatory" value="{{ v.mandatory }}"/>
<label>Owner token</label><input name="token" type="password" placeholder="sa-owner-2026"/>
<button type="submit">Publish</button>
</form>

<div class="card">
  <h2 style="font-size:1.05rem;margin-top:0">Local releases (no Drive / no public upload)</h2>
  <p style="font-size:.9rem;color:#475569">Copy your <code>.zip</code> into:</p>
  <pre style="background:#f1f5f9;padding:.75rem;border-radius:8px;overflow:auto">{{ folder }}</pre>
  <p style="font-size:.9rem">Then use Download URL:</p>
  <p><code>http://127.0.0.1:5056/releases/FILENAME.zip</code></p>
  <p style="font-size:.85rem;color:#64748b">Other PCs on Wi‑Fi: replace 127.0.0.1 with this PC’s LAN IP (e.g. 192.168.0.174).</p>
  <ul>
  {% for f in files %}
    <li><a href="/releases/{{ f }}">{{ f }}</a> — URL:
      <code>http://127.0.0.1:5056/releases/{{ f }}</code></li>
  {% else %}
    <li class="err">No .zip in releases/ yet — that causes Not Found if you open a download URL early.</li>
  {% endfor %}
  </ul>
</div>
</body></html>
"""

@app.get("/")
def home():
    files = list_zips()
    default_url = ""
    if files:
        default_url = f"http://127.0.0.1:5056/releases/{files[-1]}"
    return render_template_string(
        DASH, v=load_ver(), files=files, folder=RELEASES, default_url=default_url
    )

@app.post("/publish-form")
def publish_form():
    token = request.form.get("token") or ""
    if token != os.environ.get("SA_OWNER_TOKEN", "sa-owner-2026"):
        return "Unauthorized – use token sa-owner-2026", 401
    ver = load_ver()
    ver["version"] = request.form.get("version") or ver["version"]
    ver["message"] = request.form.get("message") or ver["message"]
    ver["downloadUrl"] = request.form.get("downloadUrl") or ""
    ver["mandatory"] = str(request.form.get("mandatory")).lower() in ("1", "true", "yes")
    ver["releasedAt"] = datetime.utcnow().isoformat() + "Z"
    save_ver(ver)
    files = list_zips()
    default_url = f"http://127.0.0.1:5056/releases/{files[-1]}" if files else ""
    return render_template_string(
        DASH, v=ver, files=files, folder=RELEASES, default_url=default_url
    )

@app.errorhandler(404)
def not_found(e):
    return (
        "<h1>Not Found</h1>"
        "<p>Valid paths:</p><ul>"
        "<li><a href='/'>/</a> publish page</li>"
        "<li><a href='/api/latest'>/api/latest</a></li>"
        "<li><a href='/releases'>/releases</a></li>"
        "<li>/releases/your-file.zip</li>"
        "</ul>"
        "<p>If you wanted a ZIP: copy it into the <code>releases</code> folder and use the exact filename.</p>",
        404,
    )

if __name__ == "__main__":
    if not os.path.exists(VER_FILE):
        save_ver(load_ver())
    print("=" * 50)
    print("  SA Invoice – Update Server")
    print("  http://127.0.0.1:5056/")
    print("  Releases folder:", RELEASES)
    print("  Zips found:", list_zips() or "(none yet)")
    print("=" * 50)
    port = int(__import__("os").environ.get("PORT", "5056"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
