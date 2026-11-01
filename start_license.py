#!/usr/bin/env python3
"""Production entrypoint for the SA Invoice Pro licence and billing server."""
import os
import license_server as ls

app = ls.app

try:
    from license_health import register_health
    register_health(app, getattr(ls, "load", None))
    print("[health] /health and /api/health registered")
except Exception as e:
    print("[health] not registered:", e)

try:
    from license_dashboard_fix import register_safe_dashboard
    register_safe_dashboard(app, ls.load, ls.DASH, ls._now_display)
    print("[dashboard] safe dashboard registered")
except Exception as e:
    print("[dashboard] safe dashboard not registered:", e)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
