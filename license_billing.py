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
    from flask import request, jsonify, redirect, render_template_string

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
            "provider": "payfast",
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
        payment_details = {
            "provider": "payfast",
            "reference": payment_id,
            "gatewayTransactionId": str(form.get("pf_payment_id") or ""),
            "status": "success",
            "amount": str(expected_amount),
            "currency": "ZAR",
            "customerEmail": expected_email,
            "plan": expected_plan,
            "planName": plan.get("name"),
            "seats": seats,
            "channel": "PayFast",
            "paidAt": now,
            "verifiedAt": now,
            "licenceKey": key,
        }
        pending[payment_id] = {
            **rec,
            "provider": "payfast",
            "email": expected_email,
            "plan": expected_plan,
            "seats": seats,
            "status": "paid",
            "key": key,
            "paidAt": now,
            "pfPaymentId": str(form.get("pf_payment_id") or ""),
            "transaction": payment_details,
        }
        db.setdefault("transactions", {})[payment_id] = payment_details
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
        transaction_details = {
            "provider": "paystack",
            "reference": payment_id,
            "gatewayTransactionId": transaction.get("id"),
            "status": "success",
            "amount": str(rec.get("amount")),
            "amountMinor": actual_cents,
            "currency": "ZAR",
            "customerEmail": expected_email,
            "plan": plan_id,
            "planName": plan.get("name"),
            "seats": int(plan["seats"]),
            "channel": transaction.get("channel"),
            "authorization": transaction.get("authorization") or {},
            "paidAt": now,
            "verifiedAt": now,
            "licenceKey": key,
        }
        pending[payment_id] = {
            **rec, "status": "paid", "key": key, "paidAt": now,
            "paystackReference": payment_id,
            "gatewayTransactionId": transaction.get("id"),
            "transaction": transaction_details,
        }
        db.setdefault("transactions", {})[payment_id] = transaction_details
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
        # Return customers to the actual app. The app verifies this reference
        # with Paystack on the server before claiming/activating the licence.
        app_url = os.environ.get(
            "SA_APP_URL",
            "https://sa-invoice-pro.pcrepairdex.workers.dev",
        ).rstrip("/")
        callback_url = app_url + "/license?paystack=return"
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
        if not secret:
            try:
                owner_cfg = load_owner_config() or {}
                secret = str(((owner_cfg.get("paystack") or {}).get("secretKey")) or "").strip()
            except Exception:
                secret = ""
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
        if not isinstance(event, dict):
            return "ignored", 200
        data = event.get("data") or {}
        reference = str(data.get("reference") or "").strip()
        if not reference:
            return "missing reference", 400
        event_name = str(event.get("event") or "")
        if event_name == "charge.failed":
            db = load_db()
            rec = db.setdefault("pending_payments", {}).get(reference)
            if rec and rec.get("provider") == "paystack" and rec.get("status") == "pending":
                rec["status"] = "failed"
                rec["failureReason"] = str(data.get("gateway_response") or "Payment failed")[:180]
                rec["failedAt"] = _now()
                db.setdefault("transactions", {})[reference] = {
                    "provider": "paystack", "reference": reference,
                    "status": "failed", "customerEmail": rec.get("email"),
                    "plan": rec.get("plan"), "amount": rec.get("amount"),
                    "currency": rec.get("currency", "ZAR"),
                    "failureReason": rec["failureReason"], "failedAt": rec["failedAt"],
                }
                save_db(db)
            return "OK", 200
        if event_name != "charge.success":
            return "ignored", 200
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
            account = (db.get("accounts") or {}).get(str(rec.get("email") or "").lower(), {})
            return jsonify({
                "ok": True, "status": "paid", "licensed": True,
                "plan": rec.get("plan"), "seats": rec.get("seats"),
                "email": rec.get("email"), "paidAt": rec.get("paidAt"),
                "reference": reference, "transaction": rec.get("transaction") or {},
                "accountStatus": account.get("status"),
            })
        # Verify only this server-stored reference; never trust a browser-supplied amount.
        try:
            verified = _paystack_request("GET", "/transaction/verify/" + reference)
            if str(verified.get("status") or "").lower() == "success":
                ok, reason = _fulfil_paystack(db, reference, verified)
                if not ok:
                    return jsonify({"ok": False, "error": reason}), 400
                refreshed = (load_db().get("pending_payments") or {}).get(reference, {})
                return jsonify({
                    "ok": True, "status": "paid", "licensed": True,
                    "plan": rec.get("plan"), "seats": rec.get("seats"),
                    "email": rec.get("email"), "paidAt": refreshed.get("paidAt"),
                    "reference": reference, "transaction": refreshed.get("transaction") or {},
                })
            gateway_status = str(verified.get("status") or "pending").lower()
            if gateway_status in ("failed", "abandoned"):
                rec["status"] = "failed"
                rec["failureReason"] = str(verified.get("gateway_response") or gateway_status)[:180]
                rec["failedAt"] = _now()
                db.setdefault("transactions", {})[reference] = {
                    "provider": "paystack", "reference": reference,
                    "status": "failed", "customerEmail": rec.get("email"),
                    "plan": rec.get("plan"), "amount": rec.get("amount"),
                    "currency": rec.get("currency", "ZAR"),
                    "failureReason": rec["failureReason"], "failedAt": rec["failedAt"],
                }
                save_db(db)
            return jsonify({"ok": True, "status": gateway_status, "licensed": False})
        except Exception:
            return jsonify({"ok": True, "status": "pending", "licensed": False})

    @app.route("/admin/billing", methods=["GET", "POST"])
    def billing_admin_dashboard():
        """Owner-token protected payment and licence activation ledger."""
        expected = (os.environ.get("SA_OWNER_TOKEN") or "").strip()
        supplied = (request.form.get("token") or request.args.get("token") or "").strip()
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            return render_template_string("""
              <!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
              <title>SAIP Billing Admin</title>
              <body style="font:16px system-ui;background:#0f172a;color:#e2e8f0;padding:24px">
              <main style="max-width:420px;margin:8vh auto;background:#1e293b;padding:24px;border-radius:16px">
              <h2>Billing & activation ledger</h2><p>Owner authentication required.</p>
              <form method="post"><input name="token" type="password" required autocomplete="current-password" placeholder="Owner token" style="box-sizing:border-box;width:100%;padding:12px">
              <button style="margin-top:12px;padding:12px;width:100%">Unlock dashboard</button></form></main></body>
            """), (401 if request.method == "POST" else 200)
        db = load_db()
        txns = db.get("transactions") or {}
        pending = db.get("pending_payments") or {}
        rows = []
        for ref, rec in pending.items():
            provider = rec.get("provider") or ("payfast" if rec.get("pfPaymentId") else "paystack")
            if provider not in ("paystack", "payfast"):
                continue
            details = rec.get("transaction") or {}
            rows.append({
                "reference": ref,
                "provider": provider,
                "gateway_id": rec.get("gatewayTransactionId") or rec.get("pfPaymentId") or details.get("gatewayTransactionId") or "—",
                "email": rec.get("email") or details.get("customerEmail") or "—",
                "plan": (rec.get("plan") or details.get("plan") or "—"),
                "amount": rec.get("amount") or details.get("amount") or "—",
                "currency": rec.get("currency") or details.get("currency") or "ZAR",
                "status": rec.get("status") or "pending",
                "channel": details.get("channel") or "—",
                "created": rec.get("createdAt") or "—",
                "paid": rec.get("paidAt") or details.get("paidAt") or "—",
                "key": rec.get("key") or details.get("licenceKey") or "—",
            })
        rows.sort(key=lambda row: row["created"], reverse=True)
        successful = [r for r in rows if r["status"] == "paid"]
        pending_count = len([r for r in rows if r["status"] == "pending"])
        failed_count = len([r for r in rows if r["status"] in ("failed", "initialization_failed")])
        total = sum((Decimal(str(r["amount"])) for r in successful), Decimal("0.00"))
        return render_template_string("""
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAIP Billing Ledger</title>
        <style>body{font:14px system-ui;background:#f1f5f9;color:#0f172a;margin:0;padding:16px}main{max-width:1400px;margin:auto}.stats{display:flex;gap:10px;flex-wrap:wrap}.card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:12px 0}.stat{min-width:130px}.stat b{display:block;font-size:24px;color:#047857}table{width:100%;border-collapse:collapse;min-width:980px}td,th{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:11px;color:#64748b;text-transform:uppercase}code{overflow-wrap:anywhere}.scroll{overflow:auto}.muted{color:#64748b}</style></head><body><main>
        <h1>SA Invoice Pro · Billing & activation ledger</h1><p class="muted">Verified Paystack transactions and account activations. Refresh this page for current server records.</p>
        <div class="stats"><div class="card stat"><b>{{ successful|length }}</b>Successful activations</div><div class="card stat"><b>{{ pending_count }}</b>Pending payments</div><div class="card stat"><b>{{ failed_count }}</b>Failed / init errors</div><div class="card stat"><b>R {{ total }}</b>Verified gross total</div></div>
        <div class="card"><form method="post"><input type="hidden" name="token" value="{{ token }}"><button>Refresh ledger</button></form></div>
        <div class="card"><h2>Transactions & licence references</h2><div class="scroll"><table><thead><tr><th>Provider</th><th>Status</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Channel</th><th>Payment reference</th><th>Gateway ID</th><th>Created</th><th>Paid / activated</th><th>Licence key</th></tr></thead><tbody>
        {% for r in rows %}<tr><td>{{ r.provider }}</td><td>{{ r.status }}</td><td>{{ r.email }}</td><td>{{ r.plan }}</td><td>{{ r.currency }} {{ r.amount }}</td><td>{{ r.channel }}</td><td><code>{{ r.reference }}</code></td><td><code>{{ r.gateway_id }}</code></td><td>{{ r.created }}</td><td>{{ r.paid }}</td><td><code>{{ r.key }}</code></td></tr>{% else %}<tr><td colspan="11">No payment transactions recorded yet.</td></tr>{% endfor %}
        </tbody></table></div></div>
        <p class="muted">Only transactions independently verified by Paystack count toward successful activations and gross totals.</p>
        </main></body></html>
        """, rows=rows[:250], successful=successful, pending_count=pending_count,
             failed_count=failed_count, total=f"{total:,.2f}", token=supplied)

    print("[billing] PayFast + Paystack checkout/webhook + account claim registered")
