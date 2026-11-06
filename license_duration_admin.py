"""Developer-only duration controls for individual device licences."""
from __future__ import annotations

import calendar
from datetime import datetime, timedelta, timezone
from flask import redirect, request


def _now():
    return datetime.now(timezone.utc)


def _add_duration(start, amount, unit):
    value = int(amount)
    if unit == "hours":
        return start + timedelta(hours=value)
    if unit == "days":
        return start + timedelta(days=value)
    if unit in ("months", "years"):
        months = value if unit == "months" else value * 12
        month_index = start.month - 1 + months
        year = start.year + month_index // 12
        month = month_index % 12 + 1
        day = min(start.day, calendar.monthrange(year, month)[1])
        return start.replace(year=year, month=month, day=day)
    raise ValueError("Choose hours, days, months or years")


def register_duration_admin(app):
    @app.post("/owner/set-duration")
    def developer_set_duration():
        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        hwid = (request.form.get("hwid") or "").strip()
        raw_amount = request.form.get("duration") or ""
        unit = (request.form.get("unit") or "days").strip().lower()
        action = (request.form.get("action") or "set").strip().lower()
        if not hwid or len(hwid) > 256:
            return redirect("/?msg=Valid%20device%20ID%20required")
        try:
            amount = int(raw_amount)
        except (TypeError, ValueError):
            return redirect("/?msg=Duration%20must%20be%20a%20whole%20number")
        limits = {"hours": 87600, "days": 36500, "months": 1200, "years": 100}
        if unit not in limits or amount < 1 or amount > limits[unit] or action not in ("set", "extend"):
            return redirect("/?msg=Invalid%20duration%20or%20action")
        from license_owner_ops import _load, _save, _now as stamp
        db = _load()
        user = (db.get("users") or {}).get(hwid)
        if not isinstance(user, dict):
            return redirect("/?msg=Device%20not%20found")
        now = _now()
        existing = user.get("expiresAt") or user.get("expiry")
        base = now
        if action == "extend" and existing:
            try:
                parsed = datetime.fromisoformat(str(existing).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                if parsed > now:
                    base = parsed
            except (TypeError, ValueError):
                base = now
        expiry = _add_duration(base, amount, unit).strftime("%Y-%m-%dT%H:%M:%SZ")
        user.update({
            "expiresAt": expiry,
            "expiryEnforced": True,
            "durationValue": amount,
            "durationUnit": unit,
            "durationUpdatedAt": stamp(),
            "adminNote": "Developer set licence duration: " + str(amount) + " " + unit,
        })
        key = str(user.get("key") or "").strip().upper()
        if key:
            key_record = (db.get("keys") or {}).get(key)
            if isinstance(key_record, dict):
                key_record.update({"expiresAt": expiry, "expiryEnforced": True, "durationValue": amount, "durationUnit": unit})
        log = db.setdefault("activation_log", [])
        if not isinstance(log, list):
            log = []
        log.insert(0, {"at": stamp(), "action": "developer_set_duration", "hwid": hwid, "duration": amount, "unit": unit, "method": action, "expiresAt": expiry})
        db["activation_log"] = log[:200]
        _save(db)
        return redirect("/devices?msg=" + __import__("urllib.parse", fromlist=["quote"]).quote("Licence expiry updated to " + expiry))
