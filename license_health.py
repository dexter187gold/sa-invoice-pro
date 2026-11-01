"""Health endpoints for saip-license."""
from __future__ import annotations

from datetime import datetime, timezone


def register_health(app, load_fn=None):
    from flask import jsonify

    def _payload():
        devices = 0
        try:
            if load_fn:
                db = load_fn() or {}
                users = db.get("users") or {}
                devices = len(users) if isinstance(users, dict) else 0
        except Exception:
            pass
        return {
            "ok": True,
            "service": "saip-license",
            "version": "2.5.0",
            "devices": devices,
            "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    @app.get("/health")
    @app.get("/api/health")
    def health():
        return jsonify(_payload())

    print("[health] endpoints ready")
