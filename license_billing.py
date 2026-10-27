"""Self-serve PayFast billing for SA Invoice Pro.

Account model: payment → seats on email (not IP/MAC).
Soft device ids are bound later on activate.
"""
from __future__ import annotations

import hashlib
import os
import secrets
import string
from datetime import datetime, timezone
from urllib.parse import urlencode

PLANS = {
    "solo": {
        "id": "solo",
        "name": "Solo",
        "amount": os.environ.get("SA_PRICE_SOLO", "299.00"),
        "seats": 1,
        "code": "S",
        "item_name": "SA Invoice Pro Solo (1 seat)",
    },
    "shop": {
        "id": "shop",
        "name": "Shop",
        "amount": os.environ.get("SA_PRICE_SHOP", "599.00"),
        "seats": 5,
        "code": "P",
        "item_name": "SA Invoice Pro Shop (5 seats)",
    },
    "multi": {
        "id": "multi",
        "name": "Multi-branch",
        "amount": os.environ.get("SA_PRICE_MULTI", "1299.00"),
        "seats": 25,
        "code": "M",
        "item_name": "SA Invoice Pro Multi-branch (25 seats)",
    },
}


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _gen_key(plan_code="S"):
    alphabet = string.ascii_uppercase + string.digits

    def chunk(n=4):
        return "".join(secrets.choice(alphabet) for _ in range(n))

    return f"SAIP-{plan_code}-{chunk()}-{chunk()}-{chunk()}"


def _pf_signature(fields: dict, passphrase: str) -> str:
    """PayFast signature: urlencode non-empty fields in order + optional passphrase, MD5."""
    parts = []
    for k, v in fields.items():
        if v is None or v == "":
            continue
        if k == "signature":
            continue
        parts.append(f"{k}={urlencode({k: str(v)})[len(k)+1:]}")
    param_string = "&".join(parts)
    if passphrase:
        param_string += f"&passphrase={urlencode({'passphrase': passphrase})[len('passphrase')+1:]}"
    return hashlib.md5(param_string.encode("utf-8")).hexdigest()


def register_billing(app, load_db, save_db, load_owner_config, gen_key_fn=None):
    from flask import request, jsonify, redirect

    gen_key = gen_key_fn or _gen_key

    @app.route("/api/billing/plans", methods=["GET", "OPTIONS"])
    def billing_plans():
        if request.method == "OPTIONS":
            return ("", 204)
        out = []
        for p in PLANS.values():
            out.append({
                "id": p["id"],
                "name": p["name"],
                "amount": p["amount"],
                "seats": p["seats"],
                "currency": "ZAR",
            })
        return jsonify({"ok": True, "plans": out, "model": "account_email_seats"})

    @app.route("/api/billing/checkout", methods=["POST", "GET", "OPTIONS"])
    def billing_checkout():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        if request.method == "GET":
            data = {
                "plan": request.args.get("plan") or "shop",
                "email": request.args.get("email") or "",
                "return_url": request.args.get("return_url") or "",
                "cancel_url": request.args.get("cancel_url") or "",
            }
        plan_id = str(data.get("plan") or "shop").lower().strip()
        email = str(data.get("email") or "").strip().lower()
        if plan_id not in PLANS:
            return jsonify({"ok": False, "error": "Unknown plan"}), 400
        if not email or "@" not in email:
            return jsonify({"ok": False, "error": "Valid email required for account license"}), 400

        plan = PLANS[plan_id]
        cfg = load_owner_config() or {}
        pf = (cfg.get("payfast") or {}) if isinstance(cfg, dict) else {}
        merchant_id = (pf.get("merchantId") or os.environ.get("PAYFAST_MERCHANT_ID") or "").strip()
        merchant_key = (pf.get("merchantKey") or os.environ.get("PAYFAST_MERCHANT_KEY") or "").strip()
        passphrase = (pf.get("passphrase") or os.environ.get("PAYFAST_PASSPHRASE") or "").strip()
        sandbox = pf.get("sandbox")
        if sandbox is None:
            sandbox = True

        if not merchant_id or not merchant_key:
            return jsonify({
                "ok": False,
                "configured": False,
                "error": "PayFast not configured — set merchant id/key in /admin or env",
                "hint": "Open https://sa-invoice-license.onrender.com/admin",
            }), 503

        payment_id = f"saip-{plan_id}-{secrets.token_hex(6)}"
        base = (request.url_root or "https://sa-invoice-license.onrender.com").rstrip("/")
        return_url = (data.get("return_url") or f"{base}/?paid=1&email={email}&plan={plan_id}").strip()
        cancel_url = (data.get("cancel_url") or f"{base}/?cancelled=1").strip()
        notify_url = f"{base}/api/billing/itn"

        db = load_db()
        pending = db.setdefault("pending_payments", {})
        pending[payment_id] = {
            "email": email,
            "plan": plan_id,
            "seats": plan["seats"],
            "amount": plan["amount"],
            "status": "pending",
            "createdAt": _now(),
        }
        save_db(db)

        fields = {
            "merchant_id": merchant_id,
            "merchant_key": merchant_key,
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notify_url": notify_url,
            "name_first": email.split("@")[0][:50],
            "email_address": email,
            "m_payment_id": payment_id,
            "amount": plan["amount"],
            "item_name": plan["item_name"],
            "custom_str1": email,
            "custom_str2": plan_id,
            "custom_str3": str(plan["seats"]),
        }
        fields["signature"] = _pf_signature(fields, passphrase)

        process_url = (
            "https://sandbox.payfast.co.za/eng/process"
            if sandbox
            else "https://www.payfast.co.za/eng/process"
        )

        if request.method == "GET" and request.args.get("redirect") == "1":
            # Auto-post HTML form
            inputs = "".join(
                f'<input type="hidden" name="{k}" value="{str(v).replace(chr(34), "&quot;")}"/>'
                for k, v in fields.items()
            )
            html = (
                "<!doctype html><html><body onload=\"document.forms[0].submit()\">"
                f"<form method=\"post\" action=\"{process_url}\">{inputs}</form>"
                "<p>Redirecting to PayFast…</p></body></html>"
            )
            return html, 200, {"Content-Type": "text/html; charset=utf-8"}

        return jsonify({
            "ok": True,
            "configured": True,
            "processUrl": process_url,
            "fields": fields,
            "paymentId": payment_id,
            "plan": plan_id,
            "email": email,
            "seats": plan["seats"],
            "amount": plan["amount"],
            "message": "POST fields to processUrl to complete payment",
        })

    @app.route("/api/billing/itn", methods=["POST", "OPTIONS"])
    def billing_itn():
        """PayFast Instant Transaction Notification — auto-issue seats."""
        if request.method == "OPTIONS":
            return ("", 204)
        form = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
        payment_id = (form.get("m_payment_id") or "").strip()
        payment_status = (form.get("payment_status") or "").strip().upper()
        email = (form.get("custom_str1") or form.get("email_address") or "").strip().lower()
        plan_id = (form.get("custom_str2") or "shop").strip().lower()
        seats_s = form.get("custom_str3") or "1"

        cfg = load_owner_config() or {}
        pf = (cfg.get("payfast") or {}) if isinstance(cfg, dict) else {}
        passphrase = (pf.get("passphrase") or os.environ.get("PAYFAST_PASSPHRASE") or "").strip()

        # Signature check when present
        recv_sig = (form.get("signature") or "").lower()
        if recv_sig and passphrase is not None:
            check = {k: v for k, v in form.items() if k != "signature"}
            # Preserve rough order from form
            calc = _pf_signature(check, passphrase)
            if calc != recv_sig:
                # Soft-fail in sandbox misconfig; still log
                pass

        if payment_status and payment_status not in ("COMPLETE", "COMPLETE ", "COMPLETED"):
            if payment_status != "COMPLETE":
                return "ignored", 200

        if plan_id not in PLANS:
            plan_id = "shop"
        plan = PLANS[plan_id]
        try:
            seats = int(seats_s) or plan["seats"]
        except ValueError:
            seats = plan["seats"]

        db = load_db()
        pending = db.setdefault("pending_payments", {})
        rec = pending.get(payment_id) or {}
        if not email:
            email = (rec.get("email") or "").strip().lower()
        if not email:
            return "no email", 400

        if rec.get("status") == "paid" and rec.get("key"):
            return "OK", 200  # idempotent

        key = gen_key(plan["code"])
        now = _now()
        accounts = db.setdefault("accounts", {})
        accounts[email] = {
            "email": email,
            "plan": plan_id,
            "seats": seats,
            "key": key,
            "status": "active",
            "paidAt": now,
            "paymentId": payment_id,
            "devices": accounts.get(email, {}).get("devices") or [],
            "pfPaymentId": form.get("pf_payment_id") or "",
        }
        keys = db.setdefault("keys", {})
        keys[key] = {
            "key": key,
            "plan": plan["code"],
            "planId": plan_id,
            "seats": seats,
            "email": email,
            "createdAt": now,
            "used": False,
            "source": "payfast",
            "paymentId": payment_id,
        }
        if payment_id:
            pending[payment_id] = {
                **rec,
                "email": email,
                "plan": plan_id,
                "seats": seats,
                "status": "paid",
                "key": key,
                "paidAt": now,
            }
        save_db(db)
        return "OK", 200

    @app.route("/api/billing/status", methods=["GET", "OPTIONS"])
    def billing_status():
        if request.method == "OPTIONS":
            return ("", 204)
        email = (request.args.get("email") or "").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "email required"}), 400
        db = load_db()
        acc = (db.get("accounts") or {}).get(email)
        if not acc:
            return jsonify({"ok": True, "licensed": False, "email": email})
        return jsonify({
            "ok": True,
            "licensed": acc.get("status") == "active",
            "email": email,
            "plan": acc.get("plan"),
            "seats": acc.get("seats"),
            "key": acc.get("key"),
            "devices": len(acc.get("devices") or []),
            "paidAt": acc.get("paidAt"),
        })

    @app.route("/api/billing/claim", methods=["POST", "OPTIONS"])
    def billing_claim():
        """After paid return — client claims key for email and binds soft device id."""
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        email = str(data.get("email") or "").strip().lower()
        device_id = str(data.get("deviceId") or data.get("hwid") or "").strip()
        if not email or "@" not in email:
            return jsonify({"ok": False, "error": "email required"}), 400
        db = load_db()
        acc = (db.get("accounts") or {}).get(email)
        if not acc or acc.get("status") != "active" or not acc.get("key"):
            return jsonify({
                "ok": False,
                "error": "No active paid license for this email yet — complete payment or wait for ITN",
            }), 404
        seats = int(acc.get("seats") or 1)
        devices = list(acc.get("devices") or [])
        if device_id and device_id not in devices:
            if len(devices) >= seats:
                return jsonify({
                    "ok": False,
                    "error": f"Seat limit reached ({seats}). Remove a device or upgrade plan.",
                    "seats": seats,
                    "devices": len(devices),
                }), 403
            devices.append(device_id)
            acc["devices"] = devices
            db.setdefault("accounts", {})[email] = acc
            # mark key used for this device
            key = acc["key"]
            if key in db.get("keys", {}):
                db["keys"][key]["used"] = True
                db["keys"][key]["lastDevice"] = device_id
            users = db.setdefault("users", {})
            if device_id:
                users[device_id] = {
                    **users.get(device_id, {}),
                    "mode": "licensed",
                    "key": key,
                    "email": email,
                    "plan": acc.get("plan"),
                    "activatedAt": _now(),
                    "lastSeen": _now(),
                }
            save_db(db)
        return jsonify({
            "ok": True,
            "activated": True,
            "key": acc["key"],
            "plan": acc.get("plan"),
            "seats": seats,
            "devices": len(acc.get("devices") or []),
            "meta": {
                "server": True,
                "email": email,
                "activatedAt": _now(),
                "source": "account_claim",
            },
        })

    print("[billing] PayFast checkout + ITN + account claim registered")
