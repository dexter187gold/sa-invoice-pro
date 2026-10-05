#!/usr/bin/env python3
"""Upload static client files to any FTP host (InfinityFree, cPanel, etc.).
Usage:
  python deploy/ftp_deploy.py
Edit FTP_* variables below or set env vars.
"""
from __future__ import annotations
import os, sys
from ftplib import FTP, error_perm
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("FTP_HOST", "ftp.example.com")
USER = os.environ.get("FTP_USER", "username")
PASS = os.environ.get("FTP_PASS", "password")
REMOTE = os.environ.get("FTP_REMOTE_DIR", "/public_html/sainvoice")  # remote folder

# Static client only – not Python servers
INCLUDE_DIRS = ["css", "js", "libs", "icons", "profiles", "docs"]
INCLUDE_FILES = ["index.html", "manifest.json", "sw.js", "version.json"]

def ensure_dir(ftp: FTP, path: str):
    parts = path.strip("/").split("/")
    cur = ""
    for p in parts:
        if not p:
            continue
        cur += "/" + p
        try:
            ftp.mkd(cur)
        except error_perm:
            pass

def upload_file(ftp: FTP, local: Path, remote_path: str):
    remote_dir = "/".join(remote_path.split("/")[:-1])
    if remote_dir:
        ensure_dir(ftp, remote_dir)
    with open(local, "rb") as f:
        ftp.storbinary("STOR " + remote_path, f)
    print("OK", remote_path)

def main():
    if "example.com" in HOST:
        print("Set FTP_HOST, FTP_USER, FTP_PASS, FTP_REMOTE_DIR env vars first.")
        print("Example:")
        print('  set FTP_HOST=ftp.infinityfree.com')
        print('  set FTP_USER=...')
        print('  set FTP_PASS=...')
        print('  set FTP_REMOTE_DIR=/htdocs/sainvoice')
        print('  python deploy/ftp_deploy.py')
        sys.exit(1)
    ftp = FTP(HOST, timeout=60)
    ftp.login(USER, PASS)
    print("Connected", HOST)
    ensure_dir(ftp, REMOTE)
    for name in INCLUDE_FILES:
        p = ROOT / name
        if p.is_file():
            upload_file(ftp, p, f"{REMOTE.rstrip('/')}/{name}")
    for d in INCLUDE_DIRS:
        base = ROOT / d
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if path.is_file():
                rel = path.relative_to(ROOT).as_posix()
                upload_file(ftp, path, f"{REMOTE.rstrip('/')}/{rel}")
    ftp.quit()
    print("Done. Open https://your-domain/.../index.html")

if __name__ == "__main__":
    main()
