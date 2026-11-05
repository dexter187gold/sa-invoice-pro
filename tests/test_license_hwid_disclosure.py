import os
os.environ.setdefault("LICENSE_KEY_CHECKSUM_SECRET", "test-checksum-secret-at-least-32-characters")

from unittest.mock import patch
import license_server


def test_handshake_does_not_return_issued_key_for_known_hwid():
    key = "SAIP-S-AAAA-BBBB-CCCC"
    db = {
        "users": {"HWID-TEST-001": {"hwid": "HWID-TEST-001", "mode": "handshake"}},
        "requests": {"HWID-TEST-001": {"hwid": "HWID-TEST-001", "status": "issued", "key": key}},
        "keys": {key: {"key": key, "hwid": "HWID-TEST-001"}},
    }
    client = license_server.app.test_client()
    with patch.object(license_server, "load", return_value=db), patch.object(license_server, "save"):
        response = client.post("/api/handshake", json={"hwid": "HWID-TEST-001"})
    assert response.status_code == 200
    body = response.get_json()
    assert body["keyAvailable"] is True
    assert "key" not in body


def test_already_issued_request_does_not_return_key_for_known_hwid():
    key = "SAIP-S-AAAA-BBBB-CCCC"
    db = {
        "users": {"HWID-TEST-002": {"hwid": "HWID-TEST-002", "mode": "handshake"}},
        "requests": {"HWID-TEST-002": {"hwid": "HWID-TEST-002", "status": "issued", "key": key}},
        "keys": {key: {"key": key, "hwid": "HWID-TEST-002"}},
    }
    client = license_server.app.test_client()
    with patch.object(license_server, "load", return_value=db), patch.object(license_server, "save"):
        response = client.post("/api/request", json={"hwid": "HWID-TEST-002"})
    assert response.status_code == 200
    body = response.get_json()
    assert body["keyAvailable"] is True
    assert "key" not in body


def test_legacy_activation_validation_requires_signed_proof():
    key = "SAIP-S-AAAA-BBBB-CCCC"
    db = {
        "users": {"HWID-TEST-003": {"hwid": "HWID-TEST-003", "mode": "licensed", "key": key, "activationToken": "server-proof"}},
        "requests": {},
        "keys": {key: {"key": key, "hwid": "HWID-TEST-003", "plan": "S", "days": 365}},
    }
    client = license_server.app.test_client()
    with patch.object(license_server, "load", return_value=db):
        response = client.post("/api/activate-validate", json={"hwid": "HWID-TEST-003", "key": key})
    assert response.status_code == 403
