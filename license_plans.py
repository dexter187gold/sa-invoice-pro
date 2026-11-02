"""Shared subscription plan catalogue for billing + dashboard."""
import os

PLANS = {
    "solo": {
        "id": "solo",
        "name": "Solo",
        "amount": os.environ.get("SA_PRICE_SOLO", "1999.00"),
        "seats": 1,
        "code": "S",
        "period": "year",
        "item_name": "SA Invoice Pro Solo — annual subscription (1 seat)",
    },
    "shop": {
        "id": "shop",
        "name": "Shop",
        "amount": os.environ.get("SA_PRICE_SHOP", "4999.00"),
        "seats": 5,
        "code": "P",
        "period": "year",
        "item_name": "SA Invoice Pro Shop — annual subscription (5 seats)",
    },
    "multi": {
        "id": "multi",
        "name": "Multi-branch",
        "amount": os.environ.get("SA_PRICE_MULTI", "11999.00"),
        "seats": 25,
        "code": "M",
        "period": "year",
        "item_name": "SA Invoice Pro Multi-branch — annual subscription (25 seats)",
    },
}
