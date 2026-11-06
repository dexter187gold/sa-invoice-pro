from datetime import datetime, timezone

from flask import Flask

from license_billing_admin import _rows
from license_duration_admin import _add_duration
import license_routes_v24


def test_duration_adds_hours_and_calendar_months():
    start = datetime(2026, 1, 31, 12, 0, tzinfo=timezone.utc)
    assert _add_duration(start, 5, "hours").isoformat() == "2026-01-31T17:00:00+00:00"
    assert _add_duration(start, 1, "months").isoformat() == "2026-02-28T12:00:00+00:00"


def test_duration_year_handles_leap_day():
    start = datetime(2024, 2, 29, 9, 30, tzinfo=timezone.utc)
    assert _add_duration(start, 1, "years").isoformat() == "2025-02-28T09:30:00+00:00"


def test_billing_ledger_reads_pending_payments_and_transactions():
    rows = _rows({
        "pending_payments": {
            "ps_ref_1": {
                "provider": "paystack",
                "email": "demo@example.test",
                "plan": "solo",
                "amount": "299.00",
                "currency": "ZAR",
                "status": "paid",
                "paidAt": "2026-11-01T12:00:00Z",
            }
        },
        "transactions": {
            "tx_2": {
                "email": "shop@example.test",
                "plan": "shop",
                "amount": "599.00",
                "status": "pending",
                "createdAt": "2026-11-02T12:00:00Z",
            }
        },
    })
    assert len(rows) == 2
    assert {row["reference"] for row in rows} == {"ps_ref_1", "tx_2"}
    assert next(row for row in rows if row["reference"] == "ps_ref_1")["status"] == "paid"


def test_verify_marks_expired_licence_as_expired(monkeypatch):
    db = {
        "users": {
            "device-1": {
                "hwid": "device-1",
                "mode": "licensed",
                "key": "SAIP-TEST",
                "expiresAt": "2020-01-01T00:00:00Z",
            }
        }
    }
    monkeypatch.setattr(license_routes_v24, "_load", lambda: db)
    monkeypatch.setattr(license_routes_v24, "_save", lambda value: None)
    app = Flask(__name__)
    license_routes_v24.register_v24(app)
    response = app.test_client().post(
        "/api/license/verify",
        json={"hwid": "device-1", "key": "SAIP-TEST", "activationToken": "irrelevant"},
    )
    assert response.status_code == 403
    assert response.get_json()["status"] == "expired"
    assert db["users"]["device-1"]["mode"] == "expired"
