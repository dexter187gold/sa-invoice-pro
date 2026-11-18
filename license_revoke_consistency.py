"""Ensure revoked/deleted keys disappear from overview + keys issued lists.

Render deploys saip-license from this repo (start_license.py). Soft-revoke used to
leave rows in db["keys"] without UI filters, so /keys still listed them and counts
drifted from the overview issued list.
"""
from __future__ import annotations

from flask import redirect, request


def _now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_active_key_record(record) -> bool:
    if not isinstance(record, dict):
        return False
    if record.get("revoked") or record.get("archived") or record.get("deleted"):
        return False
    status = str(record.get("status") or "").strip().lower()
    if status in ("revoked", "archived", "deleted", "suspended", "blocked"):
        return False
    return True


def is_active_request(record) -> bool:
    if not isinstance(record, dict):
        return False
    if record.get("archived") or record.get("revoked"):
        return False
    status = str(record.get("status") or "").strip().lower()
    if status in ("revoked", "archived", "deleted"):
        return False
    return bool(record.get("key"))


def active_keys(db: dict) -> dict:
    keys = db.get("keys") if isinstance(db.get("keys"), dict) else {}
    return {k: v for k, v in keys.items() if is_active_key_record(v)}


def active_issued_requests(db: dict) -> list:
    reqs = db.get("requests") if isinstance(db.get("requests"), dict) else {}
    rows = [r for r in reqs.values() if is_active_request(r)]
    rows.sort(key=lambda r: str(r.get("issuedAt") or r.get("activatedAt") or ""), reverse=True)
    return rows


def revoke_key_everywhere(db: dict, *, hwid: str = "", key: str = "", reason: str = "owner_revoke") -> dict:
    """Mark key + request archived, suspend user, clear account binding, archive key copy."""
    keys = db.setdefault("keys", {})
    reqs = db.setdefault("requests", {})
    users = db.setdefault("users", {})
    accounts = db.setdefault("accounts", {})
    archive = db.setdefault("keys_archive", {})
    now = _now()
    key = (key or "").strip().upper()
    hwid = (hwid or "").strip()
    touched = {"keys": 0, "requests": 0, "users": 0, "accounts": 0, "deletedKeyIds": []}

    if not key and hwid:
        req = reqs.get(hwid) or {}
        key = str(req.get("key") or "").strip().upper()
        user = users.get(hwid) or {}
        if not key:
            key = str(user.get("key") or "").strip().upper()

    targets = set()
    if key:
        targets.add(key)
        for k, rec in list(keys.items()):
            if not isinstance(rec, dict):
                continue
            if hwid and str(rec.get("hwid") or "") == hwid:
                targets.add(k)
    elif hwid:
        for k, rec in list(keys.items()):
            if isinstance(rec, dict) and str(rec.get("hwid") or "") == hwid:
                targets.add(k)

    for k in targets:
        rec = keys.get(k) or {}
        if not isinstance(rec, dict):
            rec = {}
        archive[k] = {
            **rec,
            "key": k,
            "revoked": True,
            "archived": True,
            "status": "revoked",
            "revokedAt": now,
            "archivedAt": now,
            "revokeReason": reason,
        }
        if k in keys:
            del keys[k]
            touched["keys"] += 1
            touched["deletedKeyIds"].append(k)

    if hwid and hwid in reqs:
        req = dict(reqs.get(hwid) or {})
        req["status"] = "revoked"
        req["archived"] = True
        req["revoked"] = True
        req["revokedAt"] = now
        reqs[hwid] = req
        touched["requests"] += 1

    for hid, req in list(reqs.items()):
        if not isinstance(req, dict):
            continue
        rk = str(req.get("key") or "").strip().upper()
        if rk and rk in targets:
            reqs[hid] = {
                **req,
                "status": "revoked",
                "archived": True,
                "revoked": True,
                "revokedAt": now,
            }
            touched["requests"] += 1

    if hwid and hwid in users:
        user = dict(users[hwid])
        user["mode"] = "suspended"
        user["status"] = "suspended"
        user["statusSetAt"] = now
        user.pop("key", None)
        user.pop("activationToken", None)
        users[hwid] = user
        touched["users"] += 1

    for email, acc in list(accounts.items()):
        if not isinstance(acc, dict):
            continue
        ak = str(acc.get("key") or "").strip().upper()
        devices = [str(d) for d in (acc.get("devices") or [])]
        if (key and ak == key) or (hwid and hwid in devices):
            accounts[email] = {
                **acc,
                "key": None,
                "status": "revoked",
                "revokedAt": now,
            }
            touched["accounts"] += 1

    return touched


def register_revoke_consistency(app, load_fn, save_fn, valid_hwid_fn, owner_page_guard_fn):
    """Override /owner/revoke-issued with cascade that keeps overview + keys in sync."""

    @app.post("/owner/revoke-issued")
    def owner_revoke_issued_consistent():
        denied = owner_page_guard_fn()
        if denied:
            return denied
        hwid = valid_hwid_fn(request.form.get("hwid"))
        key = (request.form.get("key") or "").strip().upper()
        if not hwid and not key:
            return redirect("/?msg=Invalid+device+or+key+reference")
        db = load_fn() or {}
        if not isinstance(db, dict):
            db = {}
        touched = revoke_key_everywhere(db, hwid=hwid or "", key=key, reason="owner_revoke_issued")
        save_fn(db, deleted={"keys": touched.get("deletedKeyIds", [])})
        msg = (
            f"Licence revoked. Removed {touched['keys']} key(s), "
            f"updated {touched['requests']} request(s), "
            f"{touched['users']} device(s). Overview and Keys issued refresh from live state."
        )
        return redirect("/?msg=" + msg.replace(" ", "+"))

    @app.post("/owner/delete-key")
    def owner_delete_key_consistent():
        denied = owner_page_guard_fn()
        if denied:
            return denied
        key = (request.form.get("key") or "").strip().upper()
        hwid = valid_hwid_fn(request.form.get("hwid")) or ""
        if not key and not hwid:
            return redirect("/keys?msg=Key+required")
        db = load_fn() or {}
        touched = revoke_key_everywhere(db, hwid=hwid, key=key, reason="owner_delete_key")
        save_fn(db, deleted={"keys": touched.get("deletedKeyIds", [])})
        return redirect(
            "/keys?msg="
            + f"Key+removed+from+active+list+({touched['keys']}+purged)".replace(" ", "+")
        )

    print("[revoke-consistency] /owner/revoke-issued + /owner/delete-key hardened")
