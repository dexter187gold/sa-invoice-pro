import base64
import json

import license_git_store


def test_save_state_applies_explicit_deletions_after_remote_merge(monkeypatch, tmp_path):
    remote = {
        "users": {"device-a": {"email": "demo@example.test"}, "device-b": {"email": "other@example.test"}},
        "requests": {"device-a": {"email": "demo@example.test"}},
        "keys": {"KEY-A": {"hwid": "device-a"}, "KEY-B": {"hwid": "device-b"}},
        "accounts": {"demo@example.test": {"devices": ["device-a"]}, "other@example.test": {"devices": ["device-b"]}},
    }
    writes = []

    monkeypatch.setattr(license_git_store, "_config", lambda: ("token", "owner/repo", "main", "license-server/users.json"))
    monkeypatch.setattr(license_git_store, "_read_remote", lambda cfg: (remote, "remote-sha"))
    monkeypatch.setattr(license_git_store, "_request", lambda url, token, method="GET", body=None: (writes.append(body) or 200, {}))
    monkeypatch.setattr(license_git_store, "_write_local", lambda path, state: None)

    desired = json.loads(json.dumps(remote))
    for section, key in [("users", "device-a"), ("requests", "device-a"), ("keys", "KEY-A"), ("accounts", "demo@example.test")]:
        desired[section].pop(key, None)

    license_git_store.save_state(
        desired,
        str(tmp_path / "users.json"),
        deleted={
            "users": ["device-a"],
            "requests": ["device-a"],
            "keys": ["KEY-A"],
            "accounts": ["demo@example.test"],
        },
    )

    assert writes, "Git-backed state update should be sent"
    persisted = json.loads(base64.b64decode(writes[0]["content"]).decode("utf-8"))
    assert "device-a" not in persisted["users"]
    assert "device-a" not in persisted["requests"]
    assert "KEY-A" not in persisted["keys"]
    assert "demo@example.test" not in persisted["accounts"]
    assert "other@example.test" in persisted["accounts"]
    assert "device-b" in persisted["users"]
    assert "KEY-B" in persisted["keys"]


def test_local_save_state_applies_explicit_deletions(monkeypatch, tmp_path):
    target = tmp_path / "users.json"
    target.write_text(json.dumps({
        "users": {"device-a": {}, "device-b": {}},
        "requests": {"device-a": {}},
        "keys": {"KEY-A": {}, "KEY-B": {}},
        "accounts": {"demo@example.test": {}},
    }))
    monkeypatch.setattr(license_git_store, "_config", lambda: None)

    license_git_store.save_state(
        json.loads(target.read_text()),
        str(target),
        deleted={"users": ["device-a"], "requests": ["device-a"], "keys": ["KEY-A"], "accounts": ["demo@example.test"]},
    )

    saved = json.loads(target.read_text())
    assert saved["users"] == {"device-b": {}}
    assert saved["requests"] == {}
    assert saved["keys"] == {"KEY-B": {}}
    assert saved["accounts"] == {}
