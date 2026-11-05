"""v2.4+ license aliases — server-authoritative request/activate/verify."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone

from license_git_store import load_state as _git_load_state, save_state as _git_save_state


def _data_path():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load():
    return _git_load_state(_data_path())


def _save(db):
    _git_save_state(db, _data_path())


def _server_secret():
    secret = (os.environ.get("LICENSE_SIGNING_SECRET") or "").strip()
    if len(secret) < 32:
        raise RuntimeError("LICENSE_SIGNING_SECRET must be configured with at least 32 characters")
    return secret.encode("utf-8")


def _activation_token(hwid: str, key: str, activated_at: str) -> str:
    msg = f"{hwid}|{key}|{activated_at}".encode("utf-8")
    return hmac.new(_server_secret(), msg, hashlib.sha256).hexdigest()


def _keys_equal(a: str, b: str) -> bool:
    aa = (a or "").strip().upper().encode("utf-8")
    bb = (b or "").strip().upper().encode("utf-8")
    if len(aa) != len(bb):
        return False
    return hmac.compare_digest(aa, bb)


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
        reqs = db.setdefault("requests", {})
        now = _now()
        if hwid not in users:
            users[hwid] = {
                "hwid": hwid,
                "mode": "pending_request",
                "createdAt": now,
                "lastSeen": now,
            }
        else:
            users[hwid]["lastSeen"] = now
            if data.get("version") or data.get("appVersion"):
                users[hwid]["appVersion"] = data.get("version") or data.get("appVersion")
        existing = reqs.get(hwid) or {}
        if existing.get("key"):
            _save(db)
            return jsonify({
                "ok": True,
                "status": "issued",
                "key": existing["key"],
                "message": "Key already issued for this device",
            })
        reqs[hwid] = {
            **existing,
            "hwid": hwid,
            "status": "pending",
            "requestedAt": now,
            "at": now,
            "email": (data.get("email") or "").strip().lower(),
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
            "status": "requested",
            "message": "Request recorded — complete payment or await issue, then activate with your key",
        })

    @app.route("/api/activate", methods=["POST", "OPTIONS"])
    @app.route("/api/license/activate", methods=["POST", "OPTIONS"])
    def v24_activate():
        """Key must match server store; HWID bound; returns signed activationToken."""
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        key = (data.get("key") or "").strip().upper()
        email = (data.get("email") or "").strip().lower()
        if not hwid or not key:
            return jsonify({"ok": False, "activated": False, "valid": False, "error": "hwid and key required"}), 400
        if len(hwid) > 256 or len(key) > 128:
            return jsonify({"ok": False, "activated": False, "valid": False, "error": "invalid payload length"}), 400

        db = _load()
        users = db.setdefault("users", {})
        device = users.get(hwid) or {}
        device_mode = str(device.get("mode") or "").lower()
        if device_mode in ("suspended", "blocked", "expired"):
            return jsonify({
                "ok": False, "activated": False, "valid": False,
                "error": f"Device licence status is {device_mode}. Contact support.",
                "status": device_mode,
            }), 403

        keys = db.setdefault("keys", {})
        key_rec = keys.get(key)
        req = (db.get("requests") or {}).get(hwid) or {}
        issued = (req.get("key") or "").strip().upper()

        accounts = db.get("accounts") or {}
        account = None
        if email and isinstance(accounts.get(email), dict):
            account = accounts[email]
        if not account and isinstance(accounts, dict):
            for acc in accounts.values():
                if isinstance(acc, dict) and _keys_equal(acc.get("key") or "", key):
                    account = acc
                    email = str(acc.get("email") or email).lower()
                    break

        recognised = bool(
            key_rec
            or (issued and _keys_equal(issued, key))
            or (account and _keys_equal(account.get("key") or "", key))
        )
        if not recognised:
            return jsonify({
                "ok": False, "activated": False, "valid": False,
                "error": "Invalid activation key — not recognised by the licence server",
            }), 404

        if issued and not _keys_equal(issued, key) and not key_rec and not (
            account and _keys_equal(account.get("key") or "", key)
        ):
            return jsonify({
                "ok": False, "activated": False, "valid": False,
                "error": "Key does not match the key issued for this device",
            }), 400

        seats = 1
        key_devices = []
        if key_rec:
            seats = max(1, int(key_rec.get("seats") or 1))
            key_devices = [str(value).strip() for value in (key_rec.get("devices") or []) if str(value).strip()]
            bound = (key_rec.get("hwid") or "").strip()
            if bound and bound not in key_devices:
                key_devices.append(bound)
            if hwid not in key_devices and len(key_devices) >= seats:
                return jsonify({
                    "ok": False, "activated": False, "valid": False,
                    "error": f"Seat limit reached ({seats}). Release a device or upgrade.",
                    "code": "KEY_SEAT_LIMIT_REACHED",
                    "seats": seats,
                }), 403
        if account:
            seats = int(account.get("seats") or seats or 1)
            devices = list(account.get("devices") or [])
            if hwid not in devices and len(devices) >= seats:
                return jsonify({
                    "ok": False, "activated": False, "valid": False,
                    "error": f"Seat limit reached ({seats}). Remove a device or upgrade.",
                    "seats": seats,
                }), 403

        now = _now()
        plan = "S"
        if key_rec:
            plan = key_rec.get("plan") or key_rec.get("planId") or plan
            if hwid not in key_devices:
                key_devices.append(hwid)
            key_rec = {
                **key_rec,
                "used": True,
                "activatedAt": now,
                "hwid": key_devices[0] if key_devices else hwid,
                "devices": key_devices,
            }
            keys[key] = key_rec
        if account:
            plan = account.get("plan") or plan
            devices = list(account.get("devices") or [])
            if hwid not in devices:
                devices.append(hwid)
            account = {**account, "devices": devices, "status": "active"}
            accounts[email or account.get("email")] = account
            db["accounts"] = accounts
        if req:
            req = {**req, "status": "activated", "activatedAt": now, "key": key}
            db.setdefault("requests", {})[hwid] = req

        token = _activation_token(hwid, key, now)
        users[hwid] = {
            **users.get(hwid, {}),
            "hwid": hwid,
            "mode": "licensed",
            "key": key,
            "plan": plan,
            "email": email or device.get("email") or (account or {}).get("email"),
            "activatedAt": now,
            "lastSeen": now,
            "activationToken": token,
        }
        _save(db)
        return jsonify({
            "ok": True,
            "activated": True,
            "valid": True,
            "key": key,
            "plan": plan,
            "activationToken": token,
            "meta": {
                "activatedAt": now,
                "server": True,
                "hwid": hwid,
                "plan": plan,
                "email": email or (account or {}).get("email"),
                "activationToken": token,
            },
            "message": "Activation successful",
        })

    @app.route("/api/license/verify", methods=["POST", "OPTIONS"])
    def v24_verify():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        key = (data.get("key") or "").strip().upper()
        token = (data.get("activationToken") or data.get("token") or "").strip()
        if not hwid or not key:
            return jsonify({"ok": False, "licensed": False, "error": "hwid and key required"}), 400
        db = _load()
        user = (db.get("users") or {}).get(hwid) or {}
        mode = str(user.get("mode") or "").lower()
        if mode in ("suspended", "blocked", "expired"):
            return jsonify({"ok": False, "licensed": False, "status": mode, "error": f"Device is {mode}"}), 403
        stored_key = (user.get("key") or "").strip().upper()
        if not stored_key or not _keys_equal(stored_key, key):
            return jsonify({"ok": False, "licensed": False, "error": "Key not bound to this device"}), 403
        expected = str(user.get("activationToken") or "")
        if not expected:
            return jsonify({"ok": False, "licensed": False, "error": "Activation token missing; reactivate this device"}), 403
        if not token or not hmac.compare_digest(expected, str(token)):
            return jsonify({"ok": False, "licensed": False, "error": "Activation token missing or mismatched"}), 403
        if mode != "licensed":
            return jsonify({"ok": False, "licensed": False, "status": mode or "unknown", "error": "Device is not licensed"}), 403
        return jsonify({
            "ok": True,
            "licensed": True,
            "status": "licensed",
            "plan": user.get("plan"),
            "hwid": hwid,
            "activatedAt": user.get("activatedAt"),
        })

    print("[v2.4] license_routes_v24 registered (activate+verify hardened)")
