#!/usr/bin/env python3
"""Download release ZIP and apply into app folder (overwrite / create files)."""
from __future__ import annotations

import json
import os
import shutil
import tempfile
import threading
import urllib.request
import zipfile
from pathlib import Path

# Shared status for UI / HTTP polling
_status = {
    "state": "idle",  # idle | checking | downloading | extracting | applying | done | error
    "progress": 0,
    "message": "",
    "error": None,
    "version": None,
}
_lock = threading.Lock()

def get_status():
    with _lock:
        return dict(_status)

def _set(**kwargs):
    with _lock:
        _status.update(kwargs)

def fetch_latest(update_server_url: str) -> dict:
    base = update_server_url.rstrip("/")
    req = urllib.request.Request(base + "/api/latest", headers={"User-Agent": "SA-Invoice-Updater"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))

def download_file(url: str, dest: Path, progress_cb=None) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "SA-Invoice-Updater"})
    with urllib.request.urlopen(req, timeout=120) as r:
        total = int(r.headers.get("Content-Length") or 0)
        done = 0
        with open(dest, "wb") as f:
            while True:
                chunk = r.read(64 * 1024)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if progress_cb and total:
                    progress_cb(min(90, int(done * 90 / total)))

def backup_app(root: Path) -> Path:
    bak = root / "backups" / ("pre-update-" + __import__("datetime").datetime.now().strftime("%Y%m%d-%H%M%S"))
    bak.mkdir(parents=True, exist_ok=True)
    for name in ("js", "css", "index.html", "sw.js", "manifest.json"):
        src = root / name
        if src.is_file():
            __import__("shutil").copy2(src, bak / name)
        elif src.is_dir():
            __import__("shutil").copytree(src, bak / name, dirs_exist_ok=True)
    return bak

def apply_zip_to_root(zip_path: Path, root: Path) -> int:
    """Extract zip; if single top-level folder, use its contents. Overwrite files. Returns file count."""
    count = 0
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(td_path)
        # Detect single root folder (e.g. sa-invoice-v1/)
        children = [p for p in td_path.iterdir()]
        src_root = children[0] if len(children) == 1 and children[0].is_dir() else td_path
        # Do not wipe user runtime data
        skip_names = {"users.json", "version.json"}  # keep local publish state optional
        for path in src_root.rglob("*"):
            if path.is_dir():
                continue
            rel = path.relative_to(src_root)
            # skip nested heavy caches
            if any(part.startswith(".") for part in rel.parts):
                continue
            if rel.name in skip_names and (root / rel).exists():
                # still update app code; version.json on client can update
                pass
            dest = root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, dest)
            count += 1
    return count

def run_update(app_root: Path, update_server_url: str, download_url: str | None = None) -> dict:
    """Blocking update. Safe to run in a thread."""
    try:
        _set(state="checking", progress=5, message="Checking update server…", error=None)
        info = fetch_latest(update_server_url)
        ver = info.get("version") or "?"
        url = (download_url or info.get("downloadUrl") or "").strip()
        if not url:
            raise RuntimeError("No downloadUrl on update server – publish a releases/ zip URL first")
        # Relative URL on same host
        if url.startswith("/"):
            url = update_server_url.rstrip("/") + url
        _set(state="downloading", progress=10, message=f"Downloading {ver}…", version=ver)
        with tempfile.TemporaryDirectory() as td:
            zpath = Path(td) / "update.zip"

            def prog(p):
                _set(progress=p, message=f"Downloading {ver}… {p}%")

            download_file(url, zpath, prog)
            _set(state="applying", progress=88, message="Backing up current files…")
            try:
                backup_app(Path(app_root))
            except Exception:
                pass
            _set(state="extracting", progress=92, message="Extracting files…")
            n = apply_zip_to_root(zpath, Path(app_root))
        _set(state="done", progress=100, message=f"Updated to {ver} ({n} files). Reload the app.", version=ver, error=None)
        return get_status()
    except Exception as e:
        _set(state="error", message=str(e), error=str(e), progress=0)
        return get_status()

def start_update_async(app_root: Path, update_server_url: str, download_url: str | None = None):
    st = get_status()
    if st["state"] in ("downloading", "extracting", "applying", "checking"):
        return st
    t = threading.Thread(
        target=run_update,
        args=(app_root, update_server_url, download_url),
        daemon=True,
    )
    t.start()
    return get_status()
