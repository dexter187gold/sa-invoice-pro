"""v2.4+ license aliases. Uses the same users.json as license_server.py."""
import json
import os
from datetime import datetime, timezone

def _data_path():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def _load():
    path = _data_path()
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {"users": {}, "requests": {}, "keys": {}}
            data.setdefault("users", {})
            data.setdefault("requests", {})
            data.setdefault("keys", {})
            return data
    return {"users": {}, "requests": {}, "keys": {}}

def _save(db):
    path = _data_path()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)
    os.replace(tmp, path)

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
            return jsonify({"error": "hwid required", "ok": False}), 400
        if len(hwid) > 256:
            return jsonify({"error": "hwid too long", "ok": False}), 400
        db = _load()
        users = db.setdefault("users", {})
        now = _now()
        if hwid not in users:
            users[hwid] = {
                "hwid": hwid,
                "mode": "handshake",
                "appVersion": data.get("version") or data.get("appVersion"),
                "lastSeen": now,
                "handshakeAt": now,
            }
        else:
            users[hwid]["lastSeen"] = now
            if data.get("version") or data.get("appVersion"):
                users[hwid]["appVersion"] = data.get("version") or data.get("appVersion")
        reqs = db.setdefault("requests", {})
        existing = reqs.get(hwid) or {}
        if existing.get("key"):
            _save(db)
            return jsonify({
                "ok": True,
                "key": existing["key"],
                "status": existing.get("status") or "issued",
                "plan": existing.get("plan") or "S",
                "meta": {"server": True, "alreadyIssued": True},
            })
        reqs[hwid] = {
            **existing,
            "hwid": hwid,
            "plan": data.get("plan") or "T",
            "company": data.get("company") or data.get("email") or "",
            "appVersion": data.get("version") or data.get("appVersion"),
            "at": now,
            "status": "pending",
            "key": None,
        }
        users[hwid] = {
            **users.get(hwid, {}),
            "mode": "pending_request",
            "lastSeen": now,
        }
        _save(db)
        return jsonify({
            "ok": True,
            "status": "pending",
            "message": "Request recorded — approve on the license server dashboard, then claim/activate",
            "meta": {"server": True, "requested": True},
        })

    @app.route("/api/activate", methods=["POST", "OPTIONS"])
    @app.route("/api/license/activate", methods=["POST", "OPTIONS"])
    def v24_activate():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        key = (data.get("key") or "").strip().upper()
        if not hwid or not key:
            return jsonify({"error": "hwid and key required", "ok": False}), 400
        if len(hwid) > 256 or len(key) > 128:
            return jsonify({"error": "invalid payload length", "ok": False}), 400
        db = _load()
        req = (db.get("requests") or {}).get(hwid) or {}
        key_rec = (db.get("keys") or {}).get(key)
        issued = (req.get("key") or "").upper()
        if not key_rec and issued != key:
            return jsonify({
                "error": "No key issued yet for this device — approve the request on the server",
                "ok": False,
            }), 404
        if issued and issued != key:
            return jsonify({
                "error": "Key does not match the key issued for this device",
                "ok": False,
            }), 400
        now = _now()
        if key in db.get("keys", {}):
            db["keys"][key]["used"] = True
            db["keys"][key]["activatedAt"] = now
            db["keys"][key]["hwid"] = hwid
        if req:
            req["status"] = "activated"
            req["activatedAt"] = now
            db.setdefault("requests", {})[hwid] = req
        users = db.setdefault("users", {})
        users[hwid] = {
            **users.get(hwid, {}),
            "hwid": hwid,
            "mode": "licensed",
            "key": key,
            "activatedAt": now,
            "lastSeen": now,
        }
        _save(db)
        return jsonify({
            "ok": True,
            "activated": True,
            "key": key,
            "plan": (key_rec or req).get("plan") or "S",
            "meta": {"activatedAt": now, "server": True, "hwid": hwid},
        })

    @app.route("/api/license/status", methods=["GET", "OPTIONS"])
    def v24_license_status():
        if request.method == "OPTIONS":
            return ("", 204)
        hwid = (request.args.get("hwid") or "").strip()
        if not hwid:
            return jsonify({"error": "hwid required", "ok": False}), 400
        db = _load()
        user = (db.get("users") or {}).get(hwid) or {}
        req = (db.get("requests") or {}).get(hwid) or {}
        return jsonify({
            "ok": True,
            "hwid": hwid,
            "mode": user.get("mode") or "unknown",
            "licensed": user.get("mode") == "licensed",
            "requestStatus": req.get("status"),
            "hasKey": bool(req.get("key") or user.get("key")),
            "meta": {"server": True, "lastSeen": user.get("lastSeen")},
        })
