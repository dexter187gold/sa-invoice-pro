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
                "expiryEnforced": True,
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


def test_billing_ledger_route_is_developer_gated_and_renders_rows(monkeypatch):
    import license_server
    from license_billing_admin import register_billing_admin

    monkeypatch.setattr(license_server, "owner_cookie_authenticated", lambda: False)
    app = Flask(__name__)
    register_billing_admin(app, lambda: {"transactions": {"tx-1": {"email": "demo@example.test", "status": "paid", "amount": "50"}}})
    client = app.test_client()
    assert client.get("/admin/billing").status_code == 302

    monkeypatch.setattr(license_server, "owner_cookie_authenticated", lambda: True)
    response = client.get("/admin/billing")
    assert response.status_code == 200
    assert b"Billing &amp; activation ledger" in response.data or b"Billing & activation ledger" in response.data
    assert b"demo@example.test" in response.data
    export = client.get("/admin/billing/export.csv")
    assert export.status_code == 200
    assert b"demo@example.test" in export.data


def test_duration_form_updates_existing_device_expiry(monkeypatch):
    import license_server
    import license_owner_ops
    from license_duration_admin import register_duration_admin

    db = {"users": {"device-2": {"hwid": "device-2", "mode": "licensed", "key": "SAIP-TEST"}}}
    monkeypatch.setattr(license_server, "owner_cookie_authenticated", lambda: True)
    monkeypatch.setattr(license_owner_ops, "_load", lambda: db)
    monkeypatch.setattr(license_owner_ops, "_save", lambda value: None)
    app = Flask(__name__)
    register_duration_admin(app)
    response = app.test_client().post(
        "/owner/set-duration",
        data={"hwid": "device-2", "duration": "2", "unit": "months", "action": "set"},
    )
    assert response.status_code == 302
    expiry = datetime.fromisoformat(db["users"]["device-2"]["expiresAt"].replace("Z", "+00:00"))
    assert expiry > datetime.now(timezone.utc) + __import__("datetime").timedelta(days=50)
    assert db["users"]["device-2"]["durationUnit"] == "months"


def test_developer_console_uses_separate_card_pages_without_tables(monkeypatch):
    import license_server
    from license_developer_console import register_developer_console

    monkeypatch.setattr(license_server, "owner_cookie_authenticated", lambda: True)
    app = Flask(__name__)
    app.add_url_rule("/", endpoint="dashboard", view_func=lambda: "old dashboard")
    state = {
        "users": {
            "device-1": {
                "hwid": "device-1",
                "email": "demo@example.test",
                "phone": "0800000000",
                "mode": "licensed",
                "plan": "Solo",
                "expiresAt": "2026-12-01T00:00:00Z",
            }
        },
        "requests": {
            "device-2": {
                "hwid": "device-2",
                "email": "pending@example.test",
                "status": "pending",
                "plan": "Solo",
            }
        },
        "keys": {
            "SAIP-TEST-1": {
                "plan": "Solo",
                "boundEmail": "demo@example.test",
                "hwid": "device-1",
                "used": True,
            }
        },
    }
    register_developer_console(app, lambda: state, lambda: "2026-11-06")
    client = app.test_client()

    overview = client.get("/")
    assert overview.status_code == 200
    assert b"Developer quick access" in overview.data

    devices = client.get("/devices")
    assert devices.status_code == 200
    assert b"device-card" in devices.data
    assert b"Adjust licence duration" in devices.data
    assert b"<table" not in devices.data

    requests_page = client.get("/requests")
    assert requests_page.status_code == 200
    assert b"request-card" in requests_page.data

    keys_page = client.get("/keys")
    assert keys_page.status_code == 200
    assert b"key-card" in keys_page.data
    assert b"Issue a customer-bound licence" in keys_page.data

    plans_page = client.get("/plans")
    assert plans_page.status_code == 200
    assert b"plan-card" in plans_page.data


def test_legacy_expiry_is_not_enforced_until_developer_manages_it(monkeypatch):
    import license_routes_v24

    db = {
        "users": {
            "legacy-device": {
                "hwid": "legacy-device",
                "mode": "licensed",
                "key": "LEGACY-KEY",
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
        json={"hwid": "legacy-device", "key": "LEGACY-KEY", "activationToken": "irrelevant"},
    )
    assert response.status_code != 500
    assert db["users"]["legacy-device"]["mode"] == "licensed"


def test_billing_ledger_deduplicates_shared_payment_references():
    from license_billing_admin import _rows

    rows = _rows({
        "transactions": {
            "transaction-1": {
                "reference": "pay-ref-1",
                "email": "demo@example.test",
                "status": "success",
                "amount": "299.00",
            }
        },
        "pending_payments": {
            "pay-ref-1": {
                "paystackReference": "pay-ref-1",
                "email": "demo@example.test",
                "status": "paid",
                "amount": "299.00",
            },
            "pay-ref-2": {
                "reference": "pay-ref-2",
                "email": "other@example.test",
                "status": "paid",
                "amount": "599.00",
            },
        },
    })
    assert len(rows) == 2
    assert len([row for row in rows if row["reference"] == "pay-ref-1"]) == 1
    assert next(row for row in rows if row["reference"] == "pay-ref-1")["source"] == "transactions"


def test_managed_trial_expiry_is_enforced_by_device_status_api(monkeypatch):
    import license_server

    db = {
        "users": {
            "trial-device": {
                "hwid": "trial-device",
                "mode": "trial",
                "expiryEnforced": True,
                "trialEndsAt": "2020-01-01T00:00:00Z",
            }
        }
    }
    monkeypatch.setattr(license_server, "load", lambda: db)
    monkeypatch.setattr(license_server, "save", lambda value: None)
    response = license_server.app.test_client().post(
        "/api/device-status", json={"hwid": "trial-device"}
    )
    assert response.status_code == 200
    assert response.get_json()["mode"] == "expired"
    assert response.get_json()["allowed"] is False
    assert db["users"]["trial-device"]["mode"] == "expired"


def test_duration_admin_sets_trial_end_date(monkeypatch):
    import license_server
    import license_owner_ops
    from license_duration_admin import register_duration_admin

    db = {"users": {"trial-device": {"hwid": "trial-device", "mode": "trial"}}}
    monkeypatch.setattr(license_server, "owner_cookie_authenticated", lambda: True)
    monkeypatch.setattr(license_owner_ops, "_load", lambda: db)
    monkeypatch.setattr(license_owner_ops, "_save", lambda value: None)
    app = Flask(__name__)
    register_duration_admin(app)
    response = app.test_client().post(
        "/owner/set-duration",
        data={"hwid": "trial-device", "duration": "6", "unit": "hours", "action": "set"},
    )
    assert response.status_code == 302
    user = db["users"]["trial-device"]
    assert user["expiryEnforced"] is True
    assert user["trialEndsAt"] == user["expiresAt"]


def test_switching_managed_device_to_trial_preserves_trial_expiry(monkeypatch):
    import license_server

    db = {
        "users": {
            "device-3": {
                "hwid": "device-3",
                "mode": "licensed",
                "expiresAt": "2026-12-01T00:00:00Z",
                "expiryEnforced": True,
            }
        }
    }
    monkeypatch.setattr(license_server, "_owner_api_guard", lambda: None)
    monkeypatch.setattr(license_server, "load", lambda: db)
    monkeypatch.setattr(license_server, "save", lambda value: None)
    response = license_server.app.test_client().post(
        "/api/set-status", data={"hwid": "device-3", "status": "trial"}
    )
    assert response.status_code == 302
    assert db["users"]["device-3"]["trialEndsAt"] == "2026-12-01T00:00:00Z"
