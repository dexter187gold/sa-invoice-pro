"""After paygate confirms, email/SMS the issued activation key.

Wraps existing /api/billing/itn and paystack routes by scanning newly paid
records that have a key but no successful delivery stamp.
Also exposes POST /api/billing/resend-key (owner token) for tests.
"""
from __future__ import annotations


def _try_deliver(db, save_fn, payment_id, rec):
    if not rec or rec.get("status") != "paid":
        return None
    if rec.get("delivery") and rec["delivery"].get("ok"):
        return rec.get("delivery")
    key = rec.get("key") or (rec.get("transaction") or {}).get("licenceKey")
    email = str(rec.get("email") or "").strip().lower()
    if not key or not email:
        return None
    try:
        from license_notify import deliver_license_key
    except Exception as exc:
        print("[delivery] import failed", type(exc).__name__)
        return None
    phone = str(rec.get("phone") or "")
    accounts = db.get("accounts") or {}
    if not phone and isinstance(accounts.get(email), dict):
        phone = str(accounts[email].get("phone") or "")
    plan = str(rec.get("plan") or (rec.get("transaction") or {}).get("planName") or "licence")
    seats = int(rec.get("seats") or (rec.get("transaction") or {}).get("seats") or 1)
    delivery = deliver_license_key(email=email, phone=phone, key=key, plan=plan, seats=seats)
    rec["delivery"] = delivery
    if payment_id and isinstance(db.get("transactions"), dict) and payment_id in db["transactions"]:
        db["transactions"][payment_id]["delivery"] = delivery
    if callable(save_fn):
        try:
            save_fn(db)
        except Exception as exc:
            print("[delivery] save failed", type(exc).__name__)
    print("[delivery] payment", payment_id, delivery)
    return delivery


def apply(app):
    import license_server as ls

    load_fn = getattr(ls, "load", None)
    save_fn = getattr(ls, "save", None)

    def after_billing_mutation():
        if not callable(load_fn):
            return
        try:
            db = load_fn() or {}
        except Exception:
            return
        pending = db.get("pending_payments") or {}
        if not isinstance(pending, dict):
            return
        for pid, rec in list(pending.items()):
            if not isinstance(rec, dict):
                continue
            if rec.get("status") == "paid" and rec.get("key") and not (rec.get("delivery") or {}).get("ok"):
                _try_deliver(db, save_fn, pid, rec)

    for endpoint, view in list(app.view_functions.items()):
        rule_paths = [r.rule for r in app.url_map.iter_rules() if r.endpoint == endpoint]
        interesting = any(
            p in ("/api/billing/itn", "/api/billing/paystack/webhook")
            or str(p).endswith("/paystack/status")
            for p in rule_paths
        )
        if not interesting:
            continue
        original = view

        def make_wrapper(fn):
            def wrapper(*args, **kwargs):
                result = fn(*args, **kwargs)
                try:
                    after_billing_mutation()
                except Exception as exc:
                    print("[delivery] post-hook", type(exc).__name__)
                return result

            wrapper.__name__ = getattr(fn, "__name__", "wrapped_billing")
            return wrapper

        app.view_functions[endpoint] = make_wrapper(original)
        print("[delivery] wrapped", endpoint, rule_paths)

    from flask import request, jsonify
    import os

    @app.post("/api/billing/resend-key")
    def resend_key():
        data = request.get_json(silent=True) or {}
        email = str(data.get("email") or "").strip().lower()
        token = str(request.headers.get("X-Owner-Token") or data.get("ownerToken") or "")
        if not (os.environ.get("SA_OWNER_TOKEN") or "") or token != os.environ.get("SA_OWNER_TOKEN"):
            return jsonify({"ok": False, "error": "unauthorized"}), 401
        if not callable(load_fn):
            return jsonify({"ok": False, "error": "store unavailable"}), 503
        db = load_fn() or {}
        acc = (db.get("accounts") or {}).get(email) or {}
        key = acc.get("key")
        if not key:
            return jsonify({"ok": False, "error": "no key for email"}), 404
        phone = str(data.get("phone") or acc.get("phone") or "")
        try:
            from license_notify import deliver_license_key
            result = deliver_license_key(
                email=email,
                phone=phone,
                key=key,
                plan=str(acc.get("plan") or "licence"),
                seats=int(acc.get("seats") or 1),
            )
        except Exception as exc:
            return jsonify({"ok": False, "error": type(exc).__name__}), 500
        return jsonify({"ok": bool(result.get("ok")), "delivery": result})

    print("[delivery] /api/billing/resend-key ready")
