import os
from unittest.mock import patch

from flask import Flask

import license_routes_v24 as routes


def make_app():
    app = Flask(__name__)
    routes.register_v24(app)
    app.testing = True
    return app


def test_verify_requires_matching_activation_token():
    db = {
        "users": {
            "device-a": {
                "hwid": "device-a",
                "mode": "licensed",
                "key": "SAIP-S-AAAA-BBBB-CCCC",
                "activationToken": "signed-token",
                "plan": "S",
            }
        },
        "keys": {},
        "requests": {},
        "accounts": {},
    }
    app = make_app()
    with patch.object(routes, "_load", return_value=db):
        client = app.test_client()
        payload = {"hwid": "device-a", "key": "SAIP-S-AAAA-BBBB-CCCC"}
        assert client.post("/api/license/verify", json=payload).status_code == 403
        assert client.post("/api/license/verify", json={**payload, "activationToken": "wrong"}).status_code == 403
        good = client.post("/api/license/verify", json={**payload, "activationToken": "signed-token"})
        assert good.status_code == 200
        assert good.get_json()["licensed"] is True


def test_key_seat_limit_is_enforced_without_account_record():
    key = "SAIP-S-AAAA-BBBB-CCCC"
    db = {
        "users": {"device-a": {"hwid": "device-a", "mode": "licensed", "key": key}},
        "keys": {
            key: {
                "key": key,
                "plan": "S",
                "seats": 2,
                "hwid": "device-a",
                "devices": ["device-a"],
            }
        },
        "requests": {},
        "accounts": {},
    }
    app = make_app()
    with patch.dict(os.environ, {"LICENSE_SIGNING_SECRET": "test-license-signing-secret-at-least-32-chars"}):
        with patch.object(routes, "_load", return_value=db), patch.object(routes, "_save"):
            client = app.test_client()
            second = client.post("/api/license/activate", json={"hwid": "device-b", "key": key})
            assert second.status_code == 200
            assert sorted(db["keys"][key]["devices"]) == ["device-a", "device-b"]
            third = client.post("/api/license/activate", json={"hwid": "device-c", "key": key})
            assert third.status_code == 403
            assert third.get_json()["code"] == "KEY_SEAT_LIMIT_REACHED"
            assert "device-c" not in db["keys"][key]["devices"]


def test_legacy_key_record_uses_purchased_account_seat_limit():
    key = "SAIP-P-AAAA-BBBB-CCCC"
    db = {
        "users": {"device-a": {"hwid": "device-a", "mode": "licensed", "key": key}},
        "keys": {key: {"key": key, "plan": "P", "hwid": "device-a"}},
        "requests": {},
        "accounts": {"owner@example.com": {"email": "owner@example.com", "key": key, "seats": 2, "devices": ["device-a"]}},
    }
    app = make_app()
    with patch.dict(os.environ, {"LICENSE_SIGNING_SECRET": "test-license-signing-secret-at-least-32-chars"}):
        with patch.object(routes, "_load", return_value=db), patch.object(routes, "_save"):
            client = app.test_client()
            response = client.post("/api/license/activate", json={"hwid": "device-b", "key": key, "email": "owner@example.com"})
            assert response.status_code == 200
            assert sorted(db["keys"][key]["devices"]) == ["device-a", "device-b"]
