"""Alias routes so activate/request always land on the license server.
Wire into license_server.py:
    from license_routes_v24 import register_v24
    register_v24(app)
"""
import json, time
from pathlib import Path

def register_v24(app, log_path="license_requests_v24.jsonl"):
    from flask import request, jsonify

    def save(payload):
        Path(log_path).open("a", encoding="utf-8").write(json.dumps({"ts": time.time(), **payload}) + "\n")

    @app.route("/api/request-license", methods=["POST", "OPTIONS"])
    @app.route("/api/license/request", methods=["POST", "OPTIONS"])
    def request_license():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        if not hwid:
            return jsonify({"error": "hwid required"}), 400
        key = "LIC-" + hwid.replace("HWID-", "")[:12] + "-" + str(int(time.time()))[-6:]
        rec = {"hwid": hwid, "app": data.get("app"), "version": data.get("version"), "email": data.get("email"), "key": key, "status": "pending"}
        save(rec)
        return jsonify({"ok": True, "key": key, "status": "pending", "plan": "standard", "meta": {"requested": True, "server": True}})

    @app.route("/api/activate", methods=["POST", "OPTIONS"])
    @app.route("/api/license/activate", methods=["POST", "OPTIONS"])
    def activate():
        if request.method == "OPTIONS":
            return ("", 204)
        data = request.get_json(silent=True) or {}
        hwid = (data.get("hwid") or "").strip()
        key = (data.get("key") or "").strip()
        if not hwid or not key:
            return jsonify({"error": "hwid and key required"}), 400
        save({"hwid": hwid, "key": key, "status": "activated", "step": "activate"})
        return jsonify({"ok": True, "activated": True, "key": key, "plan": "standard", "meta": {"activatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "server": True, "hwid": hwid}})
