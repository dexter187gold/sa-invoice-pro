"""v2.4 license aliases. Uses the same users.json as license_server.py."""
import json, os
from datetime import datetime

def _data_path():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

def _load():
    path = _data_path()
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"users": {}, "requests": {}, "keys": {}}

def _save(db):
    with open(_data_path(), "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

def register_v24(app):
    from flask import request, jsonify

    @app.route("/api/request-license", methods=["POST", "OPTIONS"])
    @app.route("/api/license/request", methods=["POST", "OPTIONS"])
    def v24_request_license():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        if not hwid:
            return jsonify({"error": "hwid required"}), 400
        db = _load()
        users = db.setdefault("users", {})
        if hwid not in users:
            users[hwid] = {
                "hwid": hwid,
                "mode": "handshake",
                "appVersion": data.get("version") or data.get("appVersion"),
                "lastSeen": datetime.utcnow().isoformat() + "Z",
                "handshakeAt": datetime.utcnow().isoformat() + "Z",
            }
        reqs = db.setdefault("requests", {})
        existing = reqs.get(hwid) or {}
        if existing.get("key"):
            _save(db)
            return jsonify({"ok": True, "key": existing["key"], "status": existing.get("status") or "issued", "plan": existing.get("plan") or "S", "meta": {"server": True, "alreadyIssued": True}})
        reqs[hwid] = {
            **existing,
            "hwid": hwid,
            "plan": data.get("plan") or "T",
            "company": data.get("company") or data.get("email") or "",
            "appVersion": data.get("version") or data.get("appVersion"),
            "at": datetime.utcnow().isoformat() + "Z",
            "status": "pending",
            "key": None,
        }
        users[hwid] = {**users.get(hwid, {}), "mode": "pending_request", "lastSeen": datetime.utcnow().isoformat() + "Z"}
        _save(db)
        return jsonify({"ok": True, "status": "pending", "message": "Request recorded — approve on the license server dashboard, then claim/activate", "meta": {"server": True, "requested": True}})

    @app.route("/api/activate", methods=["POST", "OPTIONS"])
    @app.route("/api/license/activate", methods=["POST", "OPTIONS"])
    def v24_activate():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        key = (data.get("key") or "").strip().upper()
        if not hwid or not key:
            return jsonify({"error": "hwid and key required"}), 400
        db = _load()
        req = (db.get("requests") or {}).get(hwid) or {}
        key_rec = (db.get("keys") or {}).get(key)
        issued = (req.get("key") or "").upper()
        if not key_rec and issued != key:
            return jsonify({"error": "No key issued yet for this device — approve the request on the server", "ok": False}), 404
        if issued and issued != key:
            return jsonify({"error": "Key does not match the key issued for this device", "ok": False}), 400
        now = datetime.utcnow().isoformat() + "Z"
        if key in db.get("keys", {}):
            db["keys"][key]["used"] = True
            db["keys"][key]["activatedAt"] = now
        if req:
            req["status"] = "activated"
            req["activatedAt"] = now
            db.setdefault("requests", {})[hwid] = req
        users = db.setdefault("users", {})
        users[hwid] = {**users.get(hwid, {}), "hwid": hwid, "mode": "licensed", "key": key, "activatedAt": now, "lastSeen": now}
        _save(db)
        return jsonify({"ok": True, "activated": True, "key": key, "plan": (key_rec or req).get("plan") or "S", "meta": {"activatedAt": now, "server": True, "hwid": hwid}})
