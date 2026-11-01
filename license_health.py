"""Register fast health probes for Render / Cloudflare uptime checks."""
from flask import jsonify
from datetime import datetime, timezone


def register_health(app, load_fn=None):
    def _now():
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    @app.get("/health")
    @app.get("/api/health")
    def health():
        devices = -1
        if callable(load_fn):
            try:
                db = load_fn() or {}
                devices = len(db.get("devices") or db.get("users") or {})
            except Exception:
                devices = -1
        return jsonify(
            {
                "ok": True,
                "service": "saip-license",
                "version": "2.4.1",
                "ts": _now(),
                "devices": devices,
            }
        )

    return app
