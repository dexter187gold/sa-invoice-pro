"""Shared subscription + contribution catalogue for billing + dashboard.

Order: Solo → Shop → Multi-branch → Lifetime → Enterprise, then tip_* contributions.
Amounts are ZAR strings; override with env SA_PRICE_* / SA_TIP_*.
"""
import os
from collections import OrderedDict


def _amt(env_key: str, default: str) -> str:
    raw = (os.environ.get(env_key) or default).strip()
    try:
        return f"{float(raw):.2f}"
    except Exception:
        return default


# Licence plans (self-serve + buyout). Dict preserves insertion order (Py3.7+).
PLANS = OrderedDict([
    ("solo", {
        "id": "solo",
        "name": "Solo",
        "amount": _amt("SA_PRICE_SOLO", "1999.00"),
        "seats": 1,
        "code": "S",
        "period": "year",
        "kind": "subscription",
        "item_name": "SA Invoice Pro Solo — annual subscription (1 seat)",
    }),
    ("shop", {
        "id": "shop",
        "name": "Shop",
        "amount": _amt("SA_PRICE_SHOP", "4999.00"),
        "seats": 5,
        "code": "P",
        "period": "year",
        "kind": "subscription",
        "item_name": "SA Invoice Pro Shop — annual subscription (5 seats)",
    }),
    ("multi", {
        "id": "multi",
        "name": "Multi-branch",
        "amount": _amt("SA_PRICE_MULTI", "11999.00"),
        "seats": 25,
        "code": "M",
        "period": "year",
        "kind": "subscription",
        "item_name": "SA Invoice Pro Multi-branch — annual subscription (25 seats)",
    }),
    ("lifetime", {
        "id": "lifetime",
        "name": "Lifetime",
        "amount": _amt("SA_PRICE_LIFETIME", "14999.00"),
        "seats": 1,
        "code": "L",
        "period": "lifetime",
        "kind": "buyout",
        "item_name": "SA Invoice Pro Lifetime — one-time buyout (1 seat)",
    }),
    ("enterprise", {
        "id": "enterprise",
        "name": "Enterprise",
        "amount": _amt("SA_PRICE_ENTERPRISE", "29999.00"),
        "seats": 25,
        "code": "E",
        "period": "lifetime",
        "kind": "buyout",
        "item_name": "SA Invoice Pro Enterprise — one-time buyout (25 seats)",
    }),
])

# Optional "buy us a coffee" contributions (do not grant a licence).
TIP_AMOUNTS = (1, 10, 20, 30, 50, 100)

for _n in TIP_AMOUNTS:
    _id = f"tip_{_n}"
    PLANS[_id] = {
        "id": _id,
        "name": f"Contribution R{_n}",
        "amount": _amt(f"SA_TIP_{_n}", f"{_n}.00"),
        "seats": 0,
        "code": "C",
        "period": "once",
        "kind": "contribution",
        "item_name": f"SA Invoice Pro — development contribution R{_n}",
    }


def get_plan(plan_id: str):
    key = str(plan_id or "").strip().lower()
    return PLANS.get(key)


def licence_plans():
    """Plans that grant a product licence (excludes tips)."""
    return [p for p in PLANS.values() if p.get("kind") != "contribution"]


def contribution_plans():
    return [p for p in PLANS.values() if p.get("kind") == "contribution"]
