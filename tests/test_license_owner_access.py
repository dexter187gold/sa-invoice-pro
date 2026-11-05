import os
from unittest.mock import patch

os.environ.setdefault("LICENSE_KEY_CHECKSUM_SECRET", "test-checksum-secret-at-least-32-characters")
os.environ.setdefault("LICENSE_SIGNING_SECRET", "test-license-signing-secret-at-least-32-characters")

import license_server


def test_owner_dashboard_and_mutations_require_owner_cookie():
    client = license_server.app.test_client()
    with patch.dict(os.environ, {"SA_OWNER_TOKEN": "owner-test-token"}):
        assert client.get("/").status_code == 302
        assert client.get("/admin").status_code == 302
        assert client.post("/issue", data={"hwid": "HWID-1", "plan": "S"}).status_code == 302
        assert client.post("/set-status", data={"hwid": "HWID-1", "status": "blocked"}).status_code == 302
        assert client.post("/api/set-status", json={"hwid": "HWID-1", "status": "blocked"}).status_code == 401
        assert client.post("/api/portal/publish", json={"payload": {"client": {"name": "X"}}}).status_code == 401


def test_public_config_never_returns_payfast_passphrase():
    client = license_server.app.test_client()
    config = {
        "googleClientId": "public-client-id",
        "payfast": {
            "merchantId": "merchant-id",
            "merchantKey": "merchant-key",
            "passphrase": "do-not-disclose",
            "sandbox": True,
        },
    }
    with patch.object(license_server, "load_owner_config", return_value=config):
        response = client.get("/api/public-config")
    assert response.status_code == 200
    payfast = response.get_json()["payfast"]
    assert payfast["merchantId"] == "merchant-id"
    assert payfast["merchantKey"] == "merchant-key"
    assert "passphrase" not in payfast


def test_portal_payfast_signature_is_server_signed_and_amount_bound():
    token = "public-portal-token"
    portal = {
        "payload": {
            "client": {"name": "Client", "email": "client@example.com"},
            "invoices": [{"id": "inv-1", "number": "INV-1", "status": "unpaid", "amountDue": 125.50}],
        },
        "expiresAt": "2099-01-01T00:00:00Z",
    }
    config = {"payfast": {"merchantId": "merchant-id", "merchantKey": "merchant-key", "passphrase": "private-passphrase", "sandbox": True}}
    client = license_server.app.test_client()
    fields = {
        "merchant_id": "merchant-id",
        "merchant_key": "merchant-key",
        "return_url": f"http://localhost/portal/{token}?paid=1",
        "cancel_url": f"http://localhost/portal/{token}?cancel=1",
        "name_first": "Client",
        "name_last": "Customer",
        "email_address": "client@example.com",
        "m_payment_id": "P-INV-1-test123",
        "amount": "125.50",
        "item_name": "Invoice INV-1",
        "item_description": "Shop — Client",
    }
    with patch.object(license_server, "load_portals", return_value={token: portal}), patch.object(license_server, "load_owner_config", return_value=config):
        response = client.post(f"/api/portal/{token}/payfast-signature", json={"fields": fields})
        assert response.status_code == 200
        signature = response.get_json()["signature"]
        assert signature
        assert "private-passphrase" not in response.get_data(as_text=True)
        bad = client.post(f"/api/portal/{token}/payfast-signature", json={"fields": {**fields, "amount": "1.00"}})
        assert bad.status_code == 403


def test_owner_token_header_can_authorize_protected_json_actions():
    client = license_server.app.test_client()
    db = {"users": {}, "requests": {}}
    with patch.dict(os.environ, {"SA_OWNER_TOKEN": "owner-test-token"}):
        with patch.object(license_server, "load", return_value=db), patch.object(license_server, "save"):
            response = client.post(
                "/api/set-status",
                headers={"X-Owner-Token": "owner-test-token"},
                json={"hwid": "HWID-1", "status": "blocked"},
            )
    assert response.status_code == 200
    assert db["users"]["HWID-1"]["mode"] == "blocked"


def test_existing_public_portal_records_are_sanitized_before_delivery():
    token = "legacy-public-portal"
    client = license_server.app.test_client()
    row = {
        "payload": {
            "client": {"name": "Client"},
            "payfast": {"merchantId": "merchant-id", "merchantKey": "merchant-key", "passphrase": "old-secret"},
        },
        "expiresAt": "2099-01-01T00:00:00Z",
    }
    with patch.object(license_server, "load_portals", return_value={token: row}):
        response = client.get(f"/api/portal/{token}")
    assert response.status_code == 200
    payfast = response.get_json()["payload"]["payfast"]
    assert payfast["merchantId"] == "merchant-id"
    assert "passphrase" not in payfast


def test_safe_dashboard_variant_also_requires_owner_cookie():
    from flask import Flask
    from license_dashboard_fix import register_safe_dashboard

    app = Flask(__name__)
    register_safe_dashboard(app, lambda: {"users": {}, "requests": {}, "keys": {}}, now_display_fn=lambda: "test")
    client = app.test_client()
    with patch.dict(os.environ, {"SA_OWNER_TOKEN": "owner-test-token"}):
        response = client.get("/")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")


def test_releasing_one_device_frees_only_that_seat():
    from flask import Flask
    import license_owner_ops

    key = "SAIP-P-AAAA-BBBB-CCCC"
    db = {
        "users": {
            "device-a": {"hwid": "device-a", "key": key, "activationToken": "token-a", "mode": "licensed", "email": "owner@example.com"},
            "device-b": {"hwid": "device-b", "key": key, "activationToken": "token-b", "mode": "licensed", "email": "owner@example.com"},
        },
        "keys": {key: {"key": key, "hwid": "device-a", "devices": ["device-a", "device-b"], "seats": 5, "used": True}},
        "accounts": {"owner@example.com": {"key": key, "devices": ["device-a", "device-b"], "seats": 5, "status": "active"}},
        "requests": {},
    }
    app = Flask(__name__)
    license_owner_ops.register_owner_ops(app)
    client = app.test_client()
    with patch.dict(os.environ, {"SA_OWNER_TOKEN": "owner-test-token"}):
        with patch.object(license_owner_ops, "_load", return_value=db), patch.object(license_owner_ops, "_save"):
            response = client.post("/api/owner/set-status", json={
                "ownerToken": "owner-test-token", "hwid": "device-a", "status": "trial",
            })
    assert response.status_code == 200
    assert db["keys"][key]["devices"] == ["device-b"]
    assert db["keys"][key]["hwid"] == "device-b"
    assert db["accounts"]["owner@example.com"]["devices"] == ["device-b"]
    assert db["users"]["device-a"]["key"] is None
    assert db["users"]["device-a"]["activationToken"] is None
    assert db["users"]["device-b"]["key"] == key
    assert db["users"]["device-b"]["activationToken"] == "token-b"


def test_owner_release_key_revokes_every_device_on_multiseat_key():
    from flask import Flask
    import license_owner_ops

    key = "SAIP-P-AAAA-BBBB-CCCC"
    db = {
        "users": {
            "device-a": {"hwid": "device-a", "key": key, "activationToken": "token-a", "mode": "licensed"},
            "device-b": {"hwid": "device-b", "key": key, "activationToken": "token-b", "mode": "licensed"},
        },
        "keys": {key: {"key": key, "hwid": "device-a", "devices": ["device-a", "device-b"], "seats": 5, "used": True}},
        "accounts": {"owner@example.com": {"key": key, "devices": ["device-a", "device-b"], "status": "active"}},
        "requests": {
            "device-a": {"key": key, "status": "activated"},
            "device-b": {"key": key, "status": "activated"},
        },
    }
    app = Flask(__name__)
    license_owner_ops.register_owner_ops(app)
    client = app.test_client()
    with patch.dict(os.environ, {"SA_OWNER_TOKEN": "owner-test-token"}):
        with patch.object(license_owner_ops, "_load", return_value=db), patch.object(license_owner_ops, "_save"):
            response = client.post("/api/owner/release-key", json={
                "ownerToken": "owner-test-token", "key": key,
            })
    assert response.status_code == 200
    assert db["keys"][key]["devices"] == []
    assert db["keys"][key]["hwid"] is None
    assert db["accounts"]["owner@example.com"]["devices"] == []
    assert db["users"]["device-a"]["activationToken"] is None
    assert db["users"]["device-b"]["activationToken"] is None
    assert db["requests"]["device-a"]["status"] == "issued"
    assert db["requests"]["device-b"]["status"] == "issued"
