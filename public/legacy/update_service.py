#!/usr/bin/env python3
"""
SA Invoice Pro – background update checker (silent apply).
Run as:
  python update_service.py --loop
Or install with NSSM (recommended on Windows without pywin32):
  nssm install SAInvoiceUpdate "C:\\Path\\to\\python.exe" "C:\\Path\\to\\update_service.py" --loop
  nssm set SAInvoiceUpdate AppDirectory "C:\\Path\\to\\sa-invoice-v1"
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import updater_core  # noqa

STATE = ROOT / "update_service_state.json"
CFG = ROOT / "update_service_config.json"

def load_cfg():
    if CFG.exists():
        return json.loads(CFG.read_text(encoding="utf-8"))
    return {
        "updateServerUrl": "http://127.0.0.1:5056",
        "intervalMinutes": 30,
        "autoApply": True
    }

def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"lastVersion": None, "lastCheck": None}

def save_state(s):
    STATE.write_text(json.dumps(s, indent=2), encoding="utf-8")

def once():
    cfg = load_cfg()
    st = load_state()
    url = (cfg.get("updateServerUrl") or "").rstrip("/")
    if not url:
        print("No updateServerUrl in update_service_config.json")
        return
    try:
        info = updater_core.fetch_latest(url)
    except Exception as e:
        print("Check failed:", e)
        return
    ver = info.get("version")
    st["lastCheck"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print("Remote version:", ver, "local state:", st.get("lastVersion"))
    # Apply if newer than last applied (service tracks its own lastVersion)
    if ver and ver != st.get("lastVersion") and cfg.get("autoApply", True):
        print("Applying update", ver)
        result = updater_core.run_update(ROOT, url, info.get("downloadUrl"))
        print(result)
        if result.get("state") == "done":
            st["lastVersion"] = ver
    save_state(st)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--once", action="store_true")
    args = ap.parse_args()
    if not CFG.exists():
        CFG.write_text(json.dumps(load_cfg(), indent=2), encoding="utf-8")
        print("Wrote", CFG)
    if args.loop:
        while True:
            once()
            mins = int(load_cfg().get("intervalMinutes") or 30)
            time.sleep(max(5, mins) * 60)
    else:
        once()

if __name__ == "__main__":
    main()
