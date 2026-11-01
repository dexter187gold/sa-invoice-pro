"""Owner-only licence operations.

Requires header X-Owner-Token matching SA_OWNER_TOKEN.
Public activate stays strict — only these routes force status / plan / seats.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import string
from datetime import datetime, timezone

from license_git_store import load_state as _git_load_state, save_state as _git_save_state

PLAN_CATALOG = {
    "T": {"code": "T", "id": "trial", "label": "Trial", "days": 7, "seats": 1, "mode": "trial", "tier": "trial"},
    "S": {"code": "S", "id": "solo", "label": "Solo", "days": 365, "seats": 1, "mode": "licensed", "tier": "solo"},
    "P": {"code": "P", "id": "shop", "label": "Shop", "days": 730, "seats": 5, "mode": "licensed", "tier": "shop"},
    "M": {"code": "M", "id": "multi", "label": "Multi-branch", "days": 365, "seats": 25, "mode": "licensed", "tier": "multi"},
    "L": {"code": "L", "id": "lifetime", "label": "Lifetime", "days": 36500, "seats": 1, "mode": "licensed", "tier": "lifetime"},
    "E": {"code": "E", "id": "enterprise", "label": "Enterprise / multi lifetime", "days": 36500, "seats": 25, "mode": "licensed", "tier": "multi"},
}

PLAN_ALIASES = {
    "trial": "T", "t": "T",
    "solo": "S", "s": "S", "standard": "S",
    "shop": "P", "p": "P", "pro": "P",
    "multi": "M", "m": "M", "branch": "M", "multi-branch": "M", "multibranch": "M",
    "lifetime": "L", "l": "L",
    "enterprise": "E", "e": "E",
}

ALLOWED_MODES = {
    "handshake", "pending_request", "trial", "licensed",
    "suspended", "blocked", "expired", "released", "transferred",
}


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
    msg = f"{hwid}|{key}|{activated_at}".encode()
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


def _resolve_plan(raw: str) -> dict:
    s = (raw or "S").strip()
    code = PLAN_ALIASES.get(s.lower()) or s.upper()[:1]
    if code not in PLAN_CATALOG:
        raise ValueError(
            f"Unknown plan '{raw}'. Use: trial|solo|shop|multi|lifetime|enterprise or T|S|P|M|L|E"
        )
    return dict(PLAN_CATALOG[code])


def _mint_key(plan_code: str) -> str:
    alphabet = string.ascii_uppercase + string.digits
    chunk = lambda n: "".join(secrets.choice(alphabet) for _ in range(n))
    return f"SAIP-{plan_code}-{chunk(4)}-{chunk(4)}-{chunk(4)}"


def _apply_plan_to_device(
    db, *,
    hwid: str,
    plan_info: dict,
    key: str | None = None,
    email: str = "",
    seats_override: int | None = None,
    note: str = "",
    release_other: bool = True,
):
    now = _now()
    plan_code = plan_info["code"]
    seats = int(seats_override if seats_override is not None else plan_info["seats"])
    mode = plan_info["mode"]
    keys = db.setdefault("keys", {})
    users = db.setdefault("users", {})

    if not key:
        key = _mint_key(plan_code)
    key = key.strip().upper()

    old_hwid = (keys.get(key) or {}).get("hwid") or ""
    if release_other and old_hwid and old_hwid != hwid:
        ou = users.get(old_hwid) or {}
        if _keys_equal(ou.get("key") or "", key):
            users[old_hwid] = {
                **ou,
                "mode": "trial",
                "status": "transferred",
                "key": None,
                "activationToken": None,
                "adminNote": f"Plan/key moved to {hwid}",
                "statusSetAt": now,
            }

    token = _activation_token(hwid, key, now) if mode == "licensed" else None
    keys[key] = {
        **(keys.get(key) or {}),
        "key": key,
        "plan": plan_code,
        "planId": plan_info["id"],
        "label": plan_info["label"],
        "days": plan_info["days"],
        "seats": seats,
        "tier": plan_info["tier"],
        "hwid": hwid if mode == "licensed" else None,
        "used": mode == "licensed",
        "activatedAt": now if mode == "licensed" else None,
        "createdAt": (keys.get(key) or {}).get("createdAt") or now,
        "ownerSetAt": now,
    }

    users[hwid] = {
        **users.get(hwid, {}),
        "hwid": hwid,
        "mode": mode,
        "status": mode,
        "key": key if mode == "licensed" else None,
        "plan": plan_code,
        "planId": plan_info["id"],
        "tier": plan_info["tier"],
        "seats": seats,
        "email": email or users.get(hwid, {}).get("email"),
        "activatedAt": now if mode == "licensed" else users.get(hwid, {}).get("activatedAt"),
        "lastSeen": now,
        "activationToken": token,
        "adminNote": note or f"Owner set plan {plan_info['label']}",
        "statusSetAt": now,
    }

    db.setdefault("requests", {})[hwid] = {
        **(db.get("requests") or {}).get(hwid, {}),
        "hwid": hwid,
        "key": key if mode == "licensed" else None,
        "status": "activated" if mode == "licensed" else mode,
        "plan": plan_code,
        "activatedAt": now if mode == "licensed" else None,
    }

    if email:
        accounts = db.setdefault("accounts", {})
        acc = accounts.get(email) or {"email": email}
        devices = list(acc.get("devices") or [])
        if old_hwid and old_hwid in devices:
            devices = [d for d in devices if d != old_hwid]
        if hwid not in devices:
            devices.append(hwid)
        acc.update({
            "email": email,
            "key": key,
            "plan": plan_code,
            "planId": plan_info["id"],
            "tier": plan_info["tier"],
            "status": "active" if mode == "licensed" else mode,
            "devices": devices,
            "seats": seats,
            "lifetime": plan_code in ("L", "E"),
        })
        accounts[email] = acc

    return {
        "ok": True,
        "hwid": hwid,
        "key": key,
        "plan": plan_code,
        "planId": plan_info["id"],
        "label": plan_info["label"],
        "tier": plan_info["tier"],
        "mode": mode,
        "seats": seats,
        "days": plan_info["days"],
        "activationToken": token,
        "releasedFrom": old_hwid if old_hwid and old_hwid != hwid else None,
        "message": f"Device set to {plan_info['label']} ({mode})",
        "meta": {
            "server": True,
            "hwid": hwid,
            "plan": plan_code,
            "planId": plan_info["id"],
            "tier": plan_info["tier"],
            "seats": seats,
            "activationToken": token,
            "activatedAt": now if mode == "licensed" else None,
            "lifetime": plan_code in ("L", "E"),
        },
    }


def register_owner_ops(app):
    from flask import request, jsonify

    def _tok(data):
        return (
            request.headers.get("X-Owner-Token")
            or (data or {}).get("token")
            or (data or {}).get("ownerToken")
            or ""
        )

    @app.route("/api/owner/plans", methods=["GET", "OPTIONS"])
    def owner_list_plans():
        if request.method == "OPTIONS":
            return ("", 204)
        return jsonify({
            "ok": True,
            "plans": list(PLAN_CATALOG.values()),
            "aliases": sorted(set(PLAN_ALIASES.keys())),
            "modes": sorted(ALLOWED_MODES),
        })

    @app.route("/api/owner/set-status", methods=["POST", "OPTIONS"])
    def owner_set_status():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        hwid = (data.get("hwid") or "").strip()
        status = (data.get("status") or data.get("mode") or "").strip().lower()
        if not hwid:
            return jsonify({"ok": False, "error": "hwid required"}), 400
        if status not in ALLOWED_MODES:
            return jsonify({"ok": False, "error": f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_MODES))}"}), 400
        db = _load()
        users = db.setdefault("users", {})
        prev = users.get(hwid) or {"hwid": hwid}
        users[hwid] = {
            **prev,
            "hwid": hwid,
            "mode": status,
            "status": status,
            "statusSetAt": _now(),
            "adminNote": data.get("note") or f"Owner forced status → {status}",
            "lastSeen": prev.get("lastSeen") or _now(),
        }
        if status in ("trial", "suspended", "blocked", "expired", "released"):
            key = (prev.get("key") or "").strip().upper()
            if key and status != "licensed":
                users[hwid]["key"] = None
                users[hwid]["activationToken"] = None
                kr = db.setdefault("keys", {}).get(key)
                if kr and (kr.get("hwid") or "") == hwid:
                    db["keys"][key] = {**kr, "hwid": None, "used": False, "releasedAt": _now()}
        req = (db.get("requests") or {}).get(hwid)
        if req:
            db.setdefault("requests", {})[hwid] = {**req, "status": status, "statusUpdatedAt": _now()}
        _save(db)
        return jsonify({"ok": True, "hwid": hwid, "mode": status, "status": status, "message": f"Status for {hwid} → {status}"})

    @app.route("/api/owner/force-plan", methods=["POST", "OPTIONS"])
    def owner_force_plan():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        hwid = (data.get("hwid") or "").strip()
        if not hwid:
            return jsonify({"ok": False, "error": "hwid required"}), 400
        try:
            plan_info = _resolve_plan(data.get("plan") or data.get("tier") or "S")
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400
        seats = data.get("seats")
        try:
            seats_override = int(seats) if seats is not None else None
        except (TypeError, ValueError):
            seats_override = None
        key = (data.get("key") or "").strip().upper() or None
        email = (data.get("email") or "").strip().lower()
        db = _load()
        result = _apply_plan_to_device(
            db, hwid=hwid, plan_info=plan_info, key=key, email=email,
            seats_override=seats_override, note=data.get("note") or "",
            release_other=data.get("releaseOther", True) is not False,
        )
        _save(db)
        return jsonify(result)

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
        keys[key] = {**key_rec, "hwid": None, "used": False, "releasedAt": _now(), "releasedBy": "owner"}
        users = db.setdefault("users", {})
        if old_hwid and old_hwid in users:
            u = users[old_hwid]
            if _keys_equal(u.get("key") or "", key):
                users[old_hwid] = {
                    **u, "mode": "trial", "status": "released", "key": None,
                    "activationToken": None,
                    "adminNote": "Key released by owner for re-activation on another device",
                    "statusSetAt": _now(),
                }
        for hid, req in list((db.get("requests") or {}).items()):
            if req and _keys_equal(req.get("key") or "", key):
                db.setdefault("requests", {})[hid] = {**req, "status": "issued", "releasedAt": _now()}
        _save(db)
        return jsonify({"ok": True, "key": key, "releasedFrom": old_hwid or None, "message": "Key unbound — activate again from the new device"})

    @app.route("/api/owner/transfer-key", methods=["POST", "OPTIONS"])
    def owner_transfer_key():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        key = (data.get("key") or "").strip().upper()
        hwid = (data.get("hwid") or data.get("targetHwid") or "").strip()
        if not key or not hwid:
            return jsonify({"ok": False, "error": "key and hwid required"}), 400
        try:
            plan_info = _resolve_plan(data.get("plan") or "L")
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400
        db = _load()
        seats = data.get("seats")
        try:
            seats_override = int(seats) if seats is not None else None
        except (TypeError, ValueError):
            seats_override = None
        result = _apply_plan_to_device(
            db, hwid=hwid, plan_info=plan_info, key=key,
            email=(data.get("email") or "").strip().lower(),
            seats_override=seats_override, note="Owner transfer-key",
        )
        _save(db)
        return jsonify(result)

    @app.route("/api/owner/force-lifetime", methods=["POST", "OPTIONS"])
    def owner_force_lifetime():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if not _owner_ok(_tok(data)):
            return jsonify({"ok": False, "error": "Owner authentication required"}), 401
        hwid = (data.get("hwid") or "").strip()
        if not hwid:
            return jsonify({"ok": False, "error": "hwid required"}), 400
        data = {**data, "plan": "L", "hwid": hwid}
        with app.test_request_context(
            "/api/owner/force-plan", method="POST", json=data,
            headers={"X-Owner-Token": _tok(data)},
        ):
            return owner_force_plan()

    print("[owner] plans / set-status / force-plan / release-key / transfer-key / force-lifetime registered")
