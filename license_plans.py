"""Shared subscription + contribution catalogue for billing + dashboard.

Order: Solo → Shop → Multi-branch (each with month / quarter / 6-month / year)
then Lifetime → Enterprise, then tip_* contributions.

Amounts are ZAR strings; override with env SA_PRICE_* / SA_TIP_*.
Monthly auto-renew uses Paystack Plans + Subscriptions (card mandate).
"""
from __future__ import annotations

import os
from collections import OrderedDict
from typing import Any


def _amt(env_key: str, default: str) -> str:
    raw = (os.environ.get(env_key) or default).strip()
    try:
        return f"{float(raw):.2f}"
    except Exception:
        return default


PERIODS = OrderedDict([
    ("month", {"label": "1 month", "months": 1, "paystack_interval": "monthly", "suffix": "month"}),
    ("quarter", {"label": "3 months", "months": 3, "paystack_interval": "quarterly", "suffix": "quarter"}),
    ("biannual", {"label": "6 months", "months": 6, "paystack_interval": "biannually", "suffix": "biannual"}),
    ("year", {"label": "12 months", "months": 12, "paystack_interval": "annually", "suffix": "year"}),
])

_TIERS = [
    {
        "base": "solo",
        "name": "Solo",
        "seats": 1,
        "code": "S",
        "prices": {
            "month": _amt("SA_PRICE_SOLO_MONTH", "199.00"),
            "quarter": _amt("SA_PRICE_SOLO_QUARTER", "549.00"),
            "biannual": _amt("SA_PRICE_SOLO_BIANNUAL", "1049.00"),
            "year": _amt("SA_PRICE_SOLO", "1999.00"),
        },
    },
    {
        "base": "shop",
        "name": "Shop",
        "seats": 5,
        "code": "P",
        "prices": {
            "month": _amt("SA_PRICE_SHOP_MONTH", "499.00"),
            "quarter": _amt("SA_PRICE_SHOP_QUARTER", "1399.00"),
            "biannual": _amt("SA_PRICE_SHOP_BIANNUAL", "2699.00"),
            "year": _amt("SA_PRICE_SHOP", "4999.00"),
        },
    },
    {
        "base": "multi",
        "name": "Multi-branch",
        "seats": 25,
        "code": "M",
        "prices": {
            "month": _amt("SA_PRICE_MULTI_MONTH", "1199.00"),
            "quarter": _amt("SA_PRICE_MULTI_QUARTER", "3299.00"),
            "biannual": _amt("SA_PRICE_MULTI_BIANNUAL", "6499.00"),
            "year": _amt("SA_PRICE_MULTI", "11999.00"),
        },
    },
]

PLANS: "OrderedDict[str, dict[str, Any]]" = OrderedDict()

for tier in _TIERS:
    for period_key, period_meta in PERIODS.items():
        plan_id = tier["base"] if period_key == "year" else f"{tier['base']}_{period_meta['suffix']}"
        amount = tier["prices"][period_key]
        PLANS[plan_id] = {
            "id": plan_id,
            "base": tier["base"],
            "name": tier["name"],
            "display_name": f"{tier['name']} · {period_meta['label']}",
            "amount": amount,
            "seats": tier["seats"],
            "code": tier["code"],
            "period": period_key,
            "months": period_meta["months"],
            "paystack_interval": period_meta["paystack_interval"],
            "kind": "subscription",
            "auto_renew_supported": period_key == "month",
            "item_name": (
                f"SA Invoice Pro {tier['name']} — {period_meta['label']} "
                f"({tier['seats']} seat{'s' if tier['seats'] != 1 else ''})"
            ),
        }

PLANS["lifetime"] = {
    "id": "lifetime",
    "base": "lifetime",
    "name": "Lifetime",
    "display_name": "Lifetime",
    "amount": _amt("SA_PRICE_LIFETIME", "14999.00"),
    "seats": 1,
    "code": "L",
    "period": "lifetime",
    "months": 0,
    "paystack_interval": None,
    "kind": "buyout",
    "auto_renew_supported": False,
    "item_name": "SA Invoice Pro Lifetime — one-time buyout (1 seat)",
}

PLANS["enterprise"] = {
    "id": "enterprise",
    "base": "enterprise",
    "name": "Enterprise",
    "display_name": "Enterprise",
    "amount": _amt("SA_PRICE_ENTERPRISE", "29999.00"),
    "seats": 25,
    "code": "E",
    "period": "lifetime",
    "months": 0,
    "paystack_interval": None,
    "kind": "buyout",
    "auto_renew_supported": False,
    "item_name": "SA Invoice Pro Enterprise — one-time buyout (25 seats)",
}

TIP_AMOUNTS = (1, 10, 20, 30, 50, 100)

for _n in TIP_AMOUNTS:
    _id = f"tip_{_n}"
    PLANS[_id] = {
        "id": _id,
        "base": "tip",
        "name": f"Contribution R{_n}",
        "display_name": f"Contribution R{_n}",
        "amount": _amt(f"SA_TIP_{_n}", f"{_n}.00"),
        "seats": 0,
        "code": "C",
        "period": "once",
        "months": 0,
        "paystack_interval": None,
        "kind": "contribution",
        "auto_renew_supported": False,
        "item_name": f"SA Invoice Pro — development contribution R{_n}",
    }


def get_plan(plan_id: str):
    key = str(plan_id or "").strip().lower()
    if key in PLANS:
        return PLANS[key]
    return None


def resolve_plan(plan_id: str = "", period: str = "") -> dict | None:
    pid = str(plan_id or "").strip().lower()
    per = str(period or "").strip().lower()
    if per in ("1", "1m", "monthly", "month"):
        per = "month"
    elif per in ("3", "3m", "quarterly", "quarter"):
        per = "quarter"
    elif per in ("6", "6m", "biannual", "biannually", "semi"):
        per = "biannual"
    elif per in ("12", "12m", "yearly", "annual", "year"):
        per = "year"

    if pid in PLANS and not per:
        return PLANS[pid]

    base = pid.split("_")[0] if pid else ""
    if base in ("solo", "shop", "multi") and per:
        candidate = base if per == "year" else f"{base}_{PERIODS[per]['suffix']}"
        return PLANS.get(candidate)

    if pid in PLANS:
        return PLANS[pid]
    return None


def licence_plans():
    return [p for p in PLANS.values() if p.get("kind") != "contribution"]


def contribution_plans():
    return [p for p in PLANS.values() if p.get("kind") == "contribution"]


def subscription_plans():
    return [p for p in PLANS.values() if p.get("kind") == "subscription"]


def catalogue_for_api(include_tips: bool = False):
    out = []
    for p in PLANS.values():
        if not include_tips and p.get("kind") == "contribution":
            continue
        out.append({
            "id": p["id"],
            "base": p.get("base"),
            "name": p.get("name"),
            "display_name": p.get("display_name") or p.get("name"),
            "amount": p["amount"],
            "seats": p["seats"],
            "code": p.get("code"),
            "period": p.get("period"),
            "months": p.get("months"),
            "kind": p.get("kind", "subscription"),
            "auto_renew_supported": bool(p.get("auto_renew_supported")),
            "paystack_interval": p.get("paystack_interval"),
        })
    return out
