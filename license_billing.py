"""Self-serve billing for SA Invoice Pro — plans, Paystack checkout, verify, webhook.

Catalogue: license_plans.PLANS (Solo→Shop→Multi→Lifetime→Enterprise + tip_*).
Default browser return: https://sa-invoice.pages.dev/payment-success.html
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import string
import urllib.error
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlencode

from license_plans import PLANS, get_plan, licence_plans

DEFAULT_SUCCESS_URL = (
    os.environ.get("PAYSTACK_CALLBACK_URL")
    or os.environ.get("SA_PAYMENT_SUCCESS_URL")
    or "https://sa-invoice.pages.dev/payment-success.html"
)
APP_LICENSE_URL = (
    os.environ.get("SA_APP_LICENSE_URL")
    or "https://sa-invoice-pro.pages.dev/license"
)

# reference -> pending checkout metadata
_PENDING: dict = {}
# email -> last successful payment summary
_PAID: dict = {}


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _gen_key(plan_code="S"):
    alphabet = string.ascii_uppercase + string.digits

    def chunk(n=4):
        return "".join(secrets.choice(alphabet) for _ in range(n))

    return f"SAIP-{plan_code}-{chunk()}-{chunk()}-{chunk()}"


def _paystack_secret(load_owner_config):
    env = (os.environ.get("PAYSTACK_SECRET_KEY") or "").strip()
    if env:
        return env
    try:
        cfg = load_owner_config() or {}
        return str((cfg.get("paystack") or {}).get("secretKey") or "").strip()
    except Exception:
        return ""


def _paystack_request(secret: str, method: str, path: str, body: dict | None = None):
    url = f"https://api.paystack.co{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        try:
            parsed = json.loads(err_body) if err_body else {}
        except Exception:
            parsed = {"message": err_body or str(e)}
        raise RuntimeError(parsed.get("message") or parsed.get("error") or str(e)) from e


def _amount_kobo(amount_str: str) -> int:
    return int(round(float(amount_str) * 100))


def _record_success(load, save, email: str, plan: dict, reference: str, amount: str):
    """Mark paid; issue activation key for licence plans (not tips)."""
    email = (email or "").strip().lower()
    kind = plan.get("kind") or "subscription"
    entry = {
        "email": email,
        "plan": plan["id"],
        "planName": plan.get("name"),
        "amount": amount,
        "reference": reference,
        "kind": kind,
        "paidAt": _now(),
        "seats": plan.get("seats") or 0,
    }
    activation = None
    if kind != "contribution":
        code = (plan.get("code") or "S")[0].upper()
        key = _gen_key(code)
        activation = {
            "key": key,
            "plan": plan["id"],
            "code": code,
            "seats": plan.get("seats") or 1,
            "issuedAt": _now(),
        }
        entry["activation"] = activation
        try:
            users = load() or {}
            # users may be dict keyed by hwid or list — support dict email index
            if isinstance(users, dict):
                bucket = users.setdefault("_billing_by_email", {})
                bucket[email] = {
                    "plan": plan["id"],
                    "seats": plan.get("seats") or 1,
                    "paidAt": entry["paidAt"],
                    "reference": reference,
                    "activationKey": key,
                    "kind": kind,
                }
                save(users)
        except Exception as exc:
            print("[billing] could not persist user billing row:", exc)
    _PAID[email] = entry
    _PENDING.pop(reference, None)
    return entry, activation


def register_billing(app, load, save, load_owner_config):
    from flask import request, jsonify

    @app.get("/api/billing/plans")
    def billing_plans():
        include_tips = str(request.args.get("tips") or "").lower() in ("1", "true", "yes")
        plans = []
        for p in PLANS.values():
            if not include_tips and p.get("kind") == "contribution":
                continue
            plans.append({
                "id": p["id"],
                "name": p["name"],
                "amount": p["amount"],
                "seats": p["seats"],
                "code": p.get("code"),
                "period": p.get("period", "year"),
                "kind": p.get("kind", "subscription"),
            })
        return jsonify({"ok": True, "plans": plans})

    @app.post("/api/billing/checkout")
    def billing_checkout():
        data = request.get_json(silent=True) or {}
        plan_id = str(data.get("plan") or "shop").strip().lower()
        email = str(data.get("email") or "").strip().lower()
        phone = str(data.get("phone") or "").strip()
        return_url = str(data.get("returnUrl") or data.get("return_url") or "").strip()
        if not email or "@" not in email:
            return jsonify({"ok": False, "error": "Valid email required"}), 400
        plan = get_plan(plan_id)
        if not plan:
            return jsonify({"ok": False, "error": f"Unknown plan: {plan_id}"}), 400

        secret = _paystack_secret(load_owner_config)
        if not secret:
            return jsonify({"ok": False, "error": "Paystack secret key not configured on licence server"}), 503

        callback = return_url or DEFAULT_SUCCESS_URL
        # Ensure app can recover reference on marketing success page
        if "payment-success" in callback and "email=" not in callback:
            sep = "&" if "?" in callback else "?"
            callback = f"{callback}{sep}email={email}&plan={plan_id}"

        amount_kobo = _amount_kobo(plan["amount"])
        if amount_kobo < 100:
            return jsonify({"ok": False, "error": "Amount too small for Paystack"}), 400

        body = {
            "email": email,
            "amount": amount_kobo,
            "currency": "ZAR",
            "callback_url": callback,
            "metadata": {
                "plan": plan_id,
                "kind": plan.get("kind"),
                "phone": phone,
                "product": "sa-invoice-pro",
            },
        }
        try:
            result = _paystack_request(secret, "POST", "/transaction/initialize", body)
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 502

        if not result.get("status"):
            return jsonify({"ok": False, "error": result.get("message") or "Paystack initialize failed"}), 502

        data_out = result.get("data") or {}
        reference = data_out.get("reference") or ""
        auth_url = data_out.get("authorization_url") or ""
        if not auth_url:
            return jsonify({"ok": False, "error": "No authorization_url from Paystack"}), 502

        _PENDING[reference] = {
            "email": email,
            "plan": plan_id,
            "amount": plan["amount"],
            "phone": phone,
            "createdAt": _now(),
        }
        return jsonify({
            "ok": True,
            "redirectUrl": auth_url,
            "url": auth_url,
            "reference": reference,
            "plan": plan_id,
            "amount": plan["amount"],
            "callback": callback,
        })

    def _verify_reference(secret: str, reference: str):
        result = _paystack_request(secret, "GET", f"/transaction/verify/{reference}")
        if not result.get("status"):
            raise RuntimeError(result.get("message") or "Verify failed")
        return result.get("data") or {}

    @app.post("/api/billing/paystack/verify")
    def billing_paystack_verify():
        data = request.get_json(silent=True) or {}
        reference = str(data.get("reference") or data.get("trxref") or "").strip()
        email = str(data.get("email") or "").strip().lower()
        if not reference:
            return jsonify({"ok": False, "error": "reference required"}), 400
        secret = _paystack_secret(load_owner_config)
        if not secret:
            return jsonify({"ok": False, "error": "Paystack not configured"}), 503
        try:
            tx = _verify_reference(secret, reference)
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 502

        status = str(tx.get("status") or "").lower()
        paid = status == "success"
        meta = tx.get("metadata") or {}
        plan_id = str(meta.get("plan") or (_PENDING.get(reference) or {}).get("plan") or "").lower()
        if not email:
            email = str(tx.get("customer", {}).get("email") or (_PENDING.get(reference) or {}).get("email") or "").lower()
        plan = get_plan(plan_id) if plan_id else None
        activation = None
        entry = None
        if paid and plan and email:
            amount = f"{(tx.get('amount') or 0) / 100:.2f}"
            entry, activation = _record_success(load, save, email, plan, reference, amount)

        return jsonify({
            "ok": True,
            "paid": paid,
            "status": status,
            "plan": plan_id,
            "email": email,
            "reference": reference,
            "activation": activation,
            "transaction": {"status": status, "amount": tx.get("amount"), "currency": tx.get("currency")},
            "appLicenseUrl": f"{APP_LICENSE_URL}?paystack=return&reference={reference}&email={email}",
        })

    @app.post("/api/billing/paystack/webhook")
    def billing_paystack_webhook():
        secret = _paystack_secret(load_owner_config)
        webhook_secret = (os.environ.get("PAYSTACK_WEBHOOK_SECRET") or secret or "").strip()
        raw = request.get_data() or b""
        sig = request.headers.get("x-paystack-signature") or request.headers.get("X-Paystack-Signature") or ""
        if webhook_secret and sig:
            digest = hmac.new(webhook_secret.encode("utf-8"), raw, hashlib.sha512).hexdigest()
            if not hmac.compare_digest(digest, sig):
                return jsonify({"ok": False, "error": "invalid signature"}), 401
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return jsonify({"ok": False, "error": "invalid json"}), 400
        event = payload.get("event") or ""
        data = payload.get("data") or {}
        if event == "charge.success" or str(data.get("status") or "").lower() == "success":
            reference = str(data.get("reference") or "").strip()
            meta = data.get("metadata") or {}
            plan_id = str(meta.get("plan") or (_PENDING.get(reference) or {}).get("plan") or "").lower()
            email = str((data.get("customer") or {}).get("email") or (_PENDING.get(reference) or {}).get("email") or "").lower()
            plan = get_plan(plan_id) if plan_id else None
            if reference and plan and email:
                amount = f"{(data.get('amount') or 0) / 100:.2f}"
                _record_success(load, save, email, plan, reference, amount)
                print(f"[billing] webhook paid {email} plan={plan_id} ref={reference}")
        return jsonify({"ok": True})

    @app.get("/api/billing/status")
    def billing_status():
        email = str(request.args.get("email") or "").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "email required"}), 400
        row = _PAID.get(email)
        if not row:
            try:
                users = load() or {}
                if isinstance(users, dict):
                    row = (users.get("_billing_by_email") or {}).get(email)
            except Exception:
                row = None
        if not row:
            return jsonify({"ok": True, "licensed": False, "email": email, "status": "none"})
        kind = row.get("kind") or "subscription"
        licensed = kind != "contribution"
        return jsonify({
            "ok": True,
            "licensed": licensed,
            "email": email,
            "plan": row.get("plan"),
            "seats": row.get("seats"),
            "paidAt": row.get("paidAt"),
            "status": "licensed" if licensed else "contribution",
            "kind": kind,
        })

    @app.post("/api/billing/claim")
    def billing_claim():
        data = request.get_json(silent=True) or {}
        email = str(data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "email required"}), 400
        row = _PAID.get(email)
        if not row:
            try:
                users = load() or {}
                if isinstance(users, dict):
                    row = (users.get("_billing_by_email") or {}).get(email)
            except Exception:
                row = None
        if not row or (row.get("kind") == "contribution"):
            return jsonify({"ok": False, "error": "No paid licence for this email"}), 404
        return jsonify({
            "ok": True,
            "plan": row.get("plan"),
            "seats": row.get("seats"),
            "meta": {
                "plan": row.get("plan"),
                "activatedAt": row.get("paidAt"),
                "reference": row.get("reference"),
            },
        })

    print("[billing] Paystack checkout + plans (licence + tips) registered")
    print(f"[billing] default callback: {DEFAULT_SUCCESS_URL}")
