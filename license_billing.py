"""Self-serve PayFast billing for SA Invoice Pro.

Account model: payment → seats on email (not IP/MAC).
Soft device ids are bound later on activate.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import string
import urllib.request
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse

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
        parts.append(f"{k}={urlencode({k: str(v).strip()})[len(k)+1:]}")
    param_string = "&".join(parts)
    if passphrase:
        param_string += f"&passphrase={urlencode({'passphrase': passphrase})[len('passphrase')+1:]}"
    return hashlib.md5(param_string.encode("utf-8")).hexdigest()


def _safe_return_url(candidate: str, site_url: str, path: str, query: dict) -> str:
    """Only permit return URLs on the configured HTTPS marketing-site origin."""
    site_url = (site_url or "https://sa-invoice.pages.dev").rstrip("/")
    origin = urlparse(site_url)
    fallback = site_url + path + ("?" + urlencode(query) if query else "")
    if not candidate:
        return fallback
    try:
        parsed = urlparse(candidate)
        if parsed.scheme == "https" and parsed.netloc == origin.netloc and parsed.path == path:
            return candidate
    except Exception:
        pass
    return fallback


def _verify_payfast_itn(form: dict, passphrase: str, sandbox: bool) -> tuple[bool, str]:
    """Verify the ITN signature in received field order, then ask PayFast to validate it."""
    received = str(form.get("signature") or "").strip().lower()
    if not received:
        return False, "Missing PayFast signature"

    # PayFast's ITN signature string includes empty submitted fields, unlike checkout
    # form signature generation. Preserve incoming field order and omit only signature.
    parts = []
    for key, value in form.items():
        if key == "signature":
            continue
        encoded = urlencode({key: str(value).strip()})[len(key) + 1:]
        parts.append(f"{key}={encoded}")
    param_string = "&".join(parts)
    if passphrase:
        encoded_passphrase = urlencode({"passphrase": passphrase.strip()})[len("passphrase") + 1:]
        param_string += f"&passphrase={encoded_passphrase}"
    expected = hashlib.md5(param_string.encode("utf-8")).hexdigest()
    if not hmac.compare_digest(expected, received):
        return False, "PayFast signature mismatch"

    host = "sandbox.payfast.co.za" if sandbox else "www.payfast.co.za"
    payload = urlencode({k: str(v) for k, v in form.items() if k != "signature"}).encode("utf-8")
    req = urllib.request.Request(
        f"https://{host}/eng/query/validate",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SA-Invoice-Pro/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            confirmation = response.read(256).decode("utf-8", errors="replace").strip()
    except Exception:
        return False, "PayFast server validation request failed"
    if confirmation != "VALID":
        return False, "PayFast server validation did not return VALID"
    return True, "VALID"


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
        site_url = os.environ.get("SA_WEBSITE_URL", "https://sa-invoice.pages.dev").rstrip("/")
        return_url = _safe_return_url(
            str(data.get("return_url") or "").strip(),
            site_url,
            "/payment-success.html",
            {"plan": plan_id, "email": email},
        )
        cancel_url = _safe_return_url(
            str(data.get("cancel_url") or "").strip(),
            site_url,
            "/payment-cancelled.html",
            {"plan": plan_id},
        )
        base = os.environ.get("SA_LICENSE_SERVER_URL", "https://sa-invoice-license.onrender.com").rstrip("/")
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
        """PayFast ITN: validate source, signature, merchant, amount and pending order."""
        if request.method == "OPTIONS":
            return ("", 204)
        form = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
        payment_id = str(form.get("m_payment_id") or "").strip()
        payment_status = str(form.get("payment_status") or "").strip().upper()
        if payment_status != "COMPLETE":
            return "ignored", 200
        if not payment_id:
            return "missing payment id", 400

        cfg = load_owner_config() or {}
        pf = (cfg.get("payfast") or {}) if isinstance(cfg, dict) else {}
        merchant_id = str(pf.get("merchantId") or os.environ.get("PAYFAST_MERCHANT_ID") or "").strip()
        passphrase = str(pf.get("passphrase") or os.environ.get("PAYFAST_PASSPHRASE") or "").strip()
        sandbox_setting = pf.get("sandbox")
        sandbox = True if sandbox_setting is None else str(sandbox_setting).lower() not in ("false", "0", "off", "no")

        db = load_db()
        pending = db.setdefault("pending_payments", {})
        rec = pending.get(payment_id)
        if not rec:
            return "unknown payment", 404
        if rec.get("status") not in ("pending", "paid"):
            return "payment is not pending", 400
        if not merchant_id or str(form.get("merchant_id") or "").strip() != merchant_id:
            return "merchant mismatch", 400

        try:
            expected_amount = Decimal(str(rec.get("amount") or "0")).quantize(Decimal("0.01"))
            received_amount = Decimal(str(form.get("amount_gross") or "0")).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError):
            return "invalid payment amount", 400
        if expected_amount <= 0 or abs(expected_amount - received_amount) > Decimal("0.01"):
            return "amount mismatch", 400

        expected_email = str(rec.get("email") or "").strip().lower()
        received_email = str(form.get("custom_str1") or form.get("email_address") or "").strip().lower()
        expected_plan = str(rec.get("plan") or "").strip().lower()
        received_plan = str(form.get("custom_str2") or "").strip().lower()
        if not expected_email or received_email != expected_email:
            return "email mismatch", 400
        if expected_plan not in PLANS or received_plan != expected_plan:
            return "plan mismatch", 400

        valid, reason = _verify_payfast_itn(form, passphrase, sandbox)
        if not valid:
            return reason, 400
        if rec.get("status") == "paid" and rec.get("key"):
            return "OK", 200

        plan = PLANS[expected_plan]
        seats = int(plan["seats"])
        key = _gen_key(plan["code"])
        now = _now()
        accounts = db.setdefault("accounts", {})
        existing_account = accounts.get(expected_email) or {}
        accounts[expected_email] = {
            **existing_account,
            "email": expected_email,
            "plan": expected_plan,
            "seats": seats,
            "key": key,
            "status": "active",
            "paidAt": now,
            "paymentId": payment_id,
            "devices": existing_account.get("devices") or [],
            "pfPaymentId": str(form.get("pf_payment_id") or ""),
        }
        keys = db.setdefault("keys", {})
        keys[key] = {
            "key": key,
            "plan": plan["code"],
            "planId": expected_plan,
            "seats": seats,
            "email": expected_email,
            "createdAt": now,
            "used": False,
            "source": "payfast",
            "paymentId": payment_id,
        }
        pending[payment_id] = {
            **rec,
            "email": expected_email,
            "plan": expected_plan,
            "seats": seats,
            "status": "paid",
            "key": key,
            "paidAt": now,
            "pfPaymentId": str(form.get("pf_payment_id") or ""),
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


    # Paystack hosted checkout: card wallets (Apple Pay / Google Pay where eligible),
    # Capitec Pay and EFT are presented according to merchant dashboard eligibility.
    def _paystack_request(method, path, payload=None):
        secret = (os.environ.get("PAYSTACK_SECRET_KEY") or "").strip()
        if not secret:
            try:
                owner_cfg = load_owner_config() or {}
                secret = str(((owner_cfg.get("paystack") or {}).get("secretKey")) or "").strip()
            except Exception:
                secret = ""
        if not secret:
            raise RuntimeError("Paystack is not configured")
        body = None if payload is None else __import__("json").dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.paystack.co" + path,
            data=body,
            headers={
                "Authorization": "Bearer " + secret,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "SA-Invoice-Pro/1.0",
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                result = __import__("json").loads(response.read().decode("utf-8"))
        except Exception as exc:
            raise RuntimeError("Paystack request failed") from exc
        if not result.get("status"):
            raise RuntimeError(str(result.get("message") or "Paystack rejected the request"))
        return result.get("data") or {}

    def _fulfil_paystack(db, payment_id, transaction):
        pending = db.setdefault("pending_payments", {})
        rec = pending.get(payment_id)
        if not rec:
            return False, "unknown payment"
        if rec.get("provider") != "paystack":
            return False, "payment provider mismatch"
        if rec.get("status") == "paid" and rec.get("key"):
            return True, "already fulfilled"
        if rec.get("status") != "pending":
            return False, "payment is not pending"
        try:
            expected_cents = int((Decimal(str(rec.get("amount"))) * 100).quantize(Decimal("1")))
            actual_cents = int(transaction.get("amount") or 0)
        except (InvalidOperation, ValueError, TypeError):
            return False, "invalid amount"
        if actual_cents != expected_cents or str(transaction.get("currency") or "").upper() != "ZAR":
            return False, "amount or currency mismatch"
        if str(transaction.get("reference") or "") != payment_id:
            return False, "reference mismatch"
        expected_email = str(rec.get("email") or "").lower()
        customer_email = str((transaction.get("customer") or {}).get("email") or "").lower()
        if customer_email and customer_email != expected_email:
            return False, "email mismatch"
        if str(transaction.get("status") or "").lower() != "success":
            return False, "transaction not successful"
        plan_id = str(rec.get("plan") or "")
        if plan_id not in PLANS:
            return False, "unknown plan"
        plan = PLANS[plan_id]
        now = _now()
        key = gen_key(plan["code"])
        accounts = db.setdefault("accounts", {})
        existing = accounts.get(expected_email) or {}
        accounts[expected_email] = {
            **existing, "email": expected_email, "plan": plan_id,
            "seats": int(plan["seats"]), "key": key, "status": "active",
            "paidAt": now, "paymentId": payment_id,
            "devices": existing.get("devices") or [],
            "paystackReference": payment_id,
        }
        db.setdefault("keys", {})[key] = {
            "key": key, "plan": plan["code"], "planId": plan_id,
            "seats": int(plan["seats"]), "email": expected_email,
            "createdAt": now, "used": False, "source": "paystack",
            "paymentId": payment_id,
        }
        pending[payment_id] = {
            **rec, "status": "paid", "key": key, "paidAt": now,
            "paystackReference": payment_id,
        }
        save_db(db)
        return True, "fulfilled"

    @app.route("/api/billing/paystack/initialize", methods=["POST", "OPTIONS"])
    def billing_paystack_initialize():
        if request.method == "OPTIONS":
            return ("", 204)
        if not (os.environ.get("PAYSTACK_SECRET_KEY") or str(((load_owner_config() or {}).get("paystack") or {}).get("secretKey") or "").strip()):
            return jsonify({"ok": False, "configured": False, "error": "Paystack test/live secret is not configured on the server"}), 503
        data = request.get_json(silent=True) or {}
        plan_id = str(data.get("plan") or "shop").lower().strip()
        email = str(data.get("email") or "").strip().lower()
        if plan_id not in PLANS:
            return jsonify({"ok": False, "error": "Unknown plan"}), 400
        if not email or "@" not in email or len(email) > 254:
            return jsonify({"ok": False, "error": "Valid email required"}), 400
        plan = PLANS[plan_id]
        amount_cents = int((Decimal(str(plan["amount"])) * 100).quantize(Decimal("1")))
        payment_id = "saip-" + plan_id + "-" + secrets.token_hex(12)
        site_url = os.environ.get("SA_WEBSITE_URL", "https://sa-invoice.pages.dev").rstrip("/")
        callback_url = site_url + "/payment-success.html"
        metadata = {
            "order_id": payment_id,
            "product": "SA Invoice Pro",
            "plan": plan_id,
            "seats": int(plan["seats"]),
        }
        db = load_db()
        db.setdefault("pending_payments", {})[payment_id] = {
            "provider": "paystack", "email": email, "plan": plan_id,
            "seats": int(plan["seats"]), "amount": str(plan["amount"]),
            "currency": "ZAR", "status": "pending", "createdAt": _now(),
        }
        save_db(db)
        try:
            channels = ["card", "apple_pay", "capitec_pay", "eft"]
            checkout = _paystack_request("POST", "/transaction/initialize", {
                "email": email, "amount": str(amount_cents), "currency": "ZAR",
                "reference": payment_id, "callback_url": callback_url,
                "metadata": metadata, "channels": channels,
            })
        except Exception as exc:
            db = load_db()
            rec = db.setdefault("pending_payments", {}).get(payment_id)
            if rec and rec.get("status") == "pending":
                rec["status"] = "initialization_failed"
                rec["failureReason"] = str(exc)[:180]
                save_db(db)
            return jsonify({"ok": False, "error": str(exc)}), 502
        db = load_db()
        rec = db.setdefault("pending_payments", {}).get(payment_id, {})
        rec["authorizationUrl"] = checkout.get("authorization_url")
        rec["accessCode"] = checkout.get("access_code")
        save_db(db)
        return jsonify({
            "ok": True, "provider": "paystack", "reference": payment_id,
            "authorizationUrl": checkout.get("authorization_url"),
            "accessCode": checkout.get("access_code"),
            "amount": plan["amount"], "currency": "ZAR", "plan": plan_id,
            "message": "Complete payment on Paystack Checkout. Licence activation follows server verification.",
        })

    @app.route("/api/billing/paystack/webhook", methods=["POST"])
    def billing_paystack_webhook():
        secret = (os.environ.get("PAYSTACK_SECRET_KEY") or "").strip()
        signature = str(request.headers.get("x-paystack-signature") or "").strip()
        raw = request.get_data(cache=True)
        if not secret or not signature:
            return "unauthorized", 401
        expected = hmac.new(secret.encode("utf-8"), raw, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return "invalid signature", 401
        try:
            event = request.get_json(force=True, silent=False)
        except Exception:
            return "invalid json", 400
        if not isinstance(event, dict) or event.get("event") != "charge.success":
            return "ignored", 200
        data = event.get("data") or {}
        reference = str(data.get("reference") or "").strip()
        if not reference:
            return "missing reference", 400
        # Always verify independently with Paystack before fulfilling the order.
        try:
            verified = _paystack_request("GET", "/transaction/verify/" + reference)
        except Exception:
            return "verification unavailable", 503
        if str(verified.get("status") or "").lower() != "success":
            return "not successful", 200
        db = load_db()
        ok, reason = _fulfil_paystack(db, reference, verified)
        if not ok:
            return reason, 400
        return "OK", 200

    @app.route("/api/billing/paystack/status", methods=["GET", "OPTIONS"])
    def billing_paystack_status():
        if request.method == "OPTIONS":
            return ("", 204)
        reference = str(request.args.get("reference") or "").strip()
        if not reference or len(reference) > 100:
            return jsonify({"ok": False, "error": "reference required"}), 400
        db = load_db()
        rec = (db.get("pending_payments") or {}).get(reference)
        if not rec or rec.get("provider") != "paystack":
            return jsonify({"ok": False, "error": "Payment not found"}), 404
        if rec.get("status") == "paid":
            return jsonify({"ok": True, "status": "paid", "licensed": True, "plan": rec.get("plan")})
        # Verify only this server-stored reference; never trust a browser-supplied amount.
        try:
            verified = _paystack_request("GET", "/transaction/verify/" + reference)
            if str(verified.get("status") or "").lower() == "success":
                ok, reason = _fulfil_paystack(db, reference, verified)
                if not ok:
                    return jsonify({"ok": False, "error": reason}), 400
                return jsonify({"ok": True, "status": "paid", "licensed": True, "plan": rec.get("plan")})
            return jsonify({"ok": True, "status": str(verified.get("status") or "pending"), "licensed": False})
        except Exception:
            return jsonify({"ok": True, "status": "pending", "licensed": False})

    print("[billing] PayFast + Paystack checkout/webhook + account claim registered")
