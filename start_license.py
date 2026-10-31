#!/usr/bin/env python3
"""Production entrypoint for the SA Invoice Pro licence and billing server.

license_server registers all routes, including billing, exactly once at import.
"""
import os
import license_server as ls

app = ls.app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
