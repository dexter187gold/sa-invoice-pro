"""Billing plan catalogue for SA Invoice Pro.

Checkout and payment callbacks are intentionally disabled in this build while
provider approval and payment configuration are pending. PLANS live in
license_plans.py (annual subscription ZAR prices).
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

from license_plans import PLANS


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _gen_key(plan_code="S"):
    alphabet = string.ascii_uppercase + string.digits

    def chunk(n=4):
        return "".join(secrets.choice(alphabet) for _ in range(n))

    return f"SAIP-{plan_code}-{chunk()}-{chunk()}-{chunk()}"


def _pf_signature(fields: dict, passphrase: str) -> str:
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


def register_billing(app, load, save, load_owner_config):
    """Expose the read-only plan catalogue; payment checkout is not enabled."""
    from flask import request, jsonify

    @app.get("/api/billing/plans")
    def billing_plans():
        plans = []
        for p in PLANS.values():
            plans.append({
                "id": p["id"],
                "name": p["name"],
                "amount": p["amount"],
                "seats": p["seats"],
                "code": p.get("code"),
                "period": p.get("period", "year"),
            })
        return jsonify({"ok": True, "plans": plans})

    print("[billing] plans endpoint registered; payment checkout is not enabled in this build")
