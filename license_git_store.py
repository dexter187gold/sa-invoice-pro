"""Durable GitHub-backed JSON state for the SAIP licence server.

Enable with LICENSE_GIT_ENABLED=true and GIT_DATA_TOKEN set on Render.
The GitHub repository is private; no credentials or state are written to logs.
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

DEFAULTS = {"users": {}, "requests": {}, "keys": {}}
API = "https://api.github.com"


def _config():
    enabled = str(os.getenv("LICENSE_GIT_ENABLED", "false")).lower() in ("1", "true", "yes", "on")
    if not enabled:
        return None
    token = (os.getenv("GIT_DATA_TOKEN") or os.getenv("GITHUB_TOKEN") or "").strip()
    if not token:
        raise RuntimeError("LICENSE_GIT_ENABLED is true but GIT_DATA_TOKEN is missing")
    repo = (os.getenv("LICENSE_DATA_REPO") or "dexter187gold/saip-sync-data").strip()
    branch = (os.getenv("LICENSE_DATA_BRANCH") or "main").strip()
    path = (os.getenv("LICENSE_DATA_PATH") or "license-server/users.json").strip().strip("/")
    return token, repo, branch, path


def _request(url, token, method="GET", body=None):
    payload = None if body is None else json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method=method, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "SA-Invoice-Pro-License-Server",
        **({"Content-Type": "application/json"} if payload is not None else {}),
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        if exc.code == 404:
            return 404, {}
        if exc.code == 409 or exc.code == 422:
            return exc.code, {}
        raise RuntimeError("GitHub state request failed with HTTP " + str(exc.code)) from None
    except Exception as exc:
        raise RuntimeError("GitHub state service unavailable: " + type(exc).__name__) from None


def _normalise(data):
    if not isinstance(data, dict):
        data = {}
    for key, value in DEFAULTS.items():
        if not isinstance(data.get(key), dict):
            data[key] = {}
    return data


def _read_remote(cfg):
    token, repo, branch, path = cfg
    url = f"{API}/repos/{repo}/contents/{path}?ref={branch}"
    status, result = _request(url, token)
    if status == 404:
        return None, None
    content = base64.b64decode(result.get("content") or "").decode("utf-8")
    return _normalise(json.loads(content)), result.get("sha")


def _merge(latest, desired):
    """Merge per-record dictionaries so concurrent device updates don't erase peers."""
    merged = _normalise(dict(latest or {}))
    desired = _normalise(dict(desired or {}))
    for section in ("users", "requests", "keys"):
        target = dict(merged.get(section) or {})
        for record_id, new_record in (desired.get(section) or {}).items():
            old_record = target.get(record_id)
            if isinstance(old_record, dict) and isinstance(new_record, dict):
                target[record_id] = {**old_record, **new_record}
            else:
                target[record_id] = new_record
        merged[section] = target
    for key, value in desired.items():
        if key not in ("users", "requests", "keys"):
            merged[key] = value
    return merged


def load_state(local_path):
    cfg = _config()
    if not cfg:
        return _read_local(local_path)
    remote, _sha = _read_remote(cfg)
    if remote is not None:
        _write_local(local_path, remote)
        return remote
    # First migration only: preserve existing local records before creating the
    # GitHub file. If no local file exists, create a clean initial state.
    initial = _read_local(local_path)
    save_state(initial, local_path)
    return initial


def save_state(data, local_path):
    cfg = _config()
    normal = _normalise(dict(data or {}))
    if not cfg:
        _write_local(local_path, normal)
        return
    token, repo, branch, path = cfg
    url = f"{API}/repos/{repo}/contents/{path}"
    desired = normal
    for attempt in range(4):
        latest, sha = _read_remote(cfg)
        if latest is not None:
            desired = _merge(latest, desired)
        encoded = base64.b64encode((json.dumps(desired, indent=2, ensure_ascii=False) + "\n").encode("utf-8")).decode("ascii")
        body = {"message": "Persist licence server state", "content": encoded, "branch": branch}
        if sha:
            body["sha"] = sha
        status, result = _request(url, token, "PUT", body)
        if status == 200 or status == 201:
            _write_local(local_path, desired)
            return
        if status not in (409, 422):
            raise RuntimeError("GitHub state write failed")
        time.sleep(0.25 * (attempt + 1))
    raise RuntimeError("GitHub state changed concurrently; retry the operation")


def _read_local(path):
    try:
        with open(path, encoding="utf-8") as stream:
            return _normalise(json.load(stream))
    except (OSError, ValueError):
        return _normalise({})


def _write_local(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as stream:
        json.dump(data, stream, indent=2, ensure_ascii=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, path)
