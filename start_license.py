#!/usr/bin/env python3
"""Production entrypoint: license_server + PayFast billing routes."""
import os

import license_server as ls

try:
    from license_billing import register_billing

    register_billing(ls.app, ls.load, ls.save, ls.load_owner_config, gen_key_fn=ls.gen_key)
except Exception as e:
    print("[billing] not loaded:", e)

app = ls.app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5055"))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
