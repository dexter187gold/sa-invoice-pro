import os
os.environ.setdefault("LICENSE_KEY_CHECKSUM_SECRET", "test-checksum-secret-at-least-32-characters")

import license_server


def test_legacy_hwid_only_claim_never_discloses_issued_key():
    client = license_server.app.test_client()
    response = client.post("/api/claim", json={"hwid": "HWID-PREDICTABLE-001"})
    assert response.status_code == 410
    body = response.get_json()
    assert body["code"] == "CLAIM_PROOF_REQUIRED"
    assert "key" not in body
