"""Owner-only licence operations: release key, transfer HWID, force lifetime.
Requires header X-Owner-Token matching SA_OWNER_TOKEN.
Does not weaken public activate — only owner-authenticated paths rebind seats.
"""
from __future__ import annotations

import hmac
import os
import secrets
import string
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


def _owner_ok(token: str) -> bool:
    expected = (os.environ.get("SA_OWNER_TOKEN") or "").strip()
    got = (token or "").strip()
    if not expected or not got:
        return False
    return hmac.compare_digest(got, expected)


def _keys_equal(a: str, b: str) -> bool:
    aa = (a or "").strip().upper().encode()
    bb = (b or "").strip().upper().encode()
    if len(aa) != len(bb):
        return False
    return hmac.compare_digest(aa, bb)


def _activation_token(hwid: str, key: str, activated_at: str) -> str:
    secret = (
        os.environ.get("LICENSE_SIGNING_SECRET")
        or os.environ.get("SA_OWNER_TOKEN")
        or "SAIP-ZA-2026-V1"
    ).encode()
    import hashlib
    msg = f"{hwid}|{key}|{activated_at}".encode()
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


def _mint_lifetime_key():
    alphabet = string.ascii_uppercase + string.digits
    chunk = lambda n: "".join(secrets.choice(alphabet) for _ in range(n))
    return f"SAIP-L-{chunk(4)}-{chunk(4)}-{chunk(4)}"


def register_owner_ops(app):
    from flask import request, jsonify

    def _tok(data):
        return (
            request.headers.get("X-Owner-Token")
            or (data or {}).get("token")
            or (data or {}).get("ownerToken")
            or ""
        )

    @app.route("/api/owner/release-key", methods=["POST", "OPTIONS"])
    def owner_release_key():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        key = (data.get("key") or "").strip().upper()
        if not key:
            return jsonify({"ok": False, "error": "key required"}), 400
        db = _load()
        keys = db.setdefault("keys", {})
        key_rec = keys.get(key)
        if not key_rec:
            return jsonify({"ok": False, "error": "Key not found"}), 404
        old_hwid = (key_rec.get("hwid") or "").strip()
        keys[key] = {
            **key_rec,
            "hwid": None,
            "used": False,
            "releasedAt": _now(),
            "releasedBy": "owner",
        }
        users = db.setdefault("users", {})
        if old_hwid and old_hwid in users:
            u = users[old_hwid]
            if _keys_equal(u.get("key") or "", key):
                users[old_hwid] = {
                    **u,
                    "mode": "trial",
                    "status": "released",
                    "key": None,
                    "activationToken": None,
                    "adminNote": "Key released by owner for re-activation on another device",
                    "statusSetAt": _now(),
                }
        for hid, req in list((db.get("requests") or {}).items()):
            if req and _keys_equal(req.get("key") or "", key):
                req = {**req, "status": "issued", "releasedAt": _now()}
                db.setdefault("requests", {})[hid] = req
        _save(db)
        return jsonify({
            "ok": True,
            "key": key,
            "releasedFrom": old_hwid or None,
            "message": "Key unbound — activate again from the new device",
        })

    @app.route("/api/owner/transfer-key", methods=["POST", "OPTIONS"])
    def owner_transfer_key():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        key = (data.get("key") or "").strip().upper()
        hwid = (data.get("hwid") or data.get("targetHwid") or "").strip()
        email = (data.get("email") or "").strip().lower()
        plan = (data.get("plan") or "L").strip().upper()[:1] or "L"
        if not key or not hwid:
            return jsonify({"ok": False, "error": "key and hwid required"}), 400
        db = _load()
        keys = db.setdefault("keys", {})
        key_rec = keys.get(key) or {
            "key": key,
            "plan": plan,
            "days": 36500 if plan in ("L", "E") else 365,
            "label": "Lifetime" if plan in ("L", "E") else "Licensed",
            "createdAt": _now(),
            "seats": int(data.get("seats") or 1),
        }
        old_hwid = (key_rec.get("hwid") or "").strip()
        users = db.setdefault("users", {})
        now = _now()
        if old_hwid and old_hwid != hwid:
            u = users.get(old_hwid) or {}
            if _keys_equal(u.get("key") or "", key):
                users[old_hwid] = {
                    **u,
                    "mode": "trial",
                    "status": "transferred",
                    "key": None,
                    "activationToken": None,
                    "adminNote": f"Transferred to {hwid}",
                    "statusSetAt": now,
                }
        token = _activation_token(hwid, key, now)
        key_rec = {
            **key_rec,
            "hwid": hwid,
            "used": True,
            "activatedAt": now,
            "plan": plan or key_rec.get("plan") or "L",
            "days": 36500 if (plan or key_rec.get("plan")) in ("L", "E") else key_rec.get("days") or 365,
            "label": "Lifetime" if (plan or key_rec.get("plan")) in ("L", "E") else key_rec.get("label") or "Licensed",
            "transferredAt": now,
            "transferredBy": "owner",
        }
        keys[key] = key_rec
        users[hwid] = {
            **users.get(hwid, {}),
            "hwid": hwid,
            "mode": "licensed",
            "status": "licensed",
            "key": key,
            "plan": key_rec.get("plan") or plan,
            "email": email or users.get(hwid, {}).get("email"),
            "activatedAt": now,
            "lastSeen": now,
            "activationToken": token,
            "adminNote": "Owner force transfer",
            "statusSetAt": now,
        }
        db.setdefault("requests", {})[hwid] = {
            **(db.get("requests") or {}).get(hwid, {}),
            "hwid": hwid,
            "key": key,
            "status": "activated",
            "plan": key_rec.get("plan") or plan,
            "activatedAt": now,
        }
        if email:
            accounts = db.setdefault("accounts", {})
            acc = accounts.get(email) or {"email": email}
            devices = [d for d in list(acc.get("devices") or []) if d != old_hwid]
            if hwid not in devices:
                devices.append(hwid)
            acc.update({
                "email": email,
                "key": key,
                "plan": key_rec.get("plan") or plan,
                "status": "active",
                "devices": devices,
                "seats": int(data.get("seats") or acc.get("seats") or 1),
                "lifetime": (key_rec.get("plan") or plan) in ("L", "E"),
            })
            accounts[email] = acc
        _save(db)
        return jsonify({
            "ok": True,
            "activated": True,
            "valid": True,
            "key": key,
            "hwid": hwid,
            "plan": key_rec.get("plan") or plan,
            "activationToken": token,
            "releasedFrom": old_hwid or None,
            "message": "Key transferred and device licensed",
            "meta": {
                "server": True,
                "hwid": hwid,
                "plan": key_rec.get("plan") or plan,
                "activationToken": token,
                "activatedAt": now,
                "lifetime": (key_rec.get("plan") or plan) in ("L", "E"),
            },
        })

    @app.route("/api/owner/force-lifetime", methods=["POST", "OPTIONS"])
    def owner_force_lifetime():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        hwid = (data.get("hwid") or "").strip()
        email = (data.get("email") or "").strip().lower()
        key = (data.get("key") or "").strip().upper() or _mint_lifetime_key()
        if not hwid:
            return jsonify({"ok": False, "error": "hwid required"}), 400
        data = {**data, "key": key, "hwid": hwid, "plan": "L", "token": _tok(data)}
        with app.test_request_context(
            "/api/owner/transfer-key",
            method="POST",
            json=data,
            headers={"X-Owner-Token": _tok(data)},
        ):
            return owner_transfer_key()

    print("[owner] release-key / transfer-key / force-lifetime registered")

