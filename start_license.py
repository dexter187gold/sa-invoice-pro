#!/usr/bin/env python3
"""Production entrypoint for the SA Invoice Pro licence and billing server."""
import os
import license_server as ls

app = ls.app

# Fast health probes for Render / uptime (safe if already registered)
try:
    from license_health import register_health
    register_health(app, getattr(ls, "load", None))
    print("[health] /health and /api/health registered")
except Exception as e:
    print("[health] not registered:", e)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
