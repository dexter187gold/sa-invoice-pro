#!/usr/bin/env python3
"""
SA Invoice Pro – Desktop Launcher + local self-update API
Port 8080 · Update API on same server (localhost only)
"""
import os
import sys
import time
import socket
import threading
import subprocess
import webbrowser
import json
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8080

def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent

ROOT = app_root()
sys.path.insert(0, str(ROOT))

try:
    import updater_core
except ImportError:
    updater_core = None

def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0

def kill_port(port: int) -> None:
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(
                f'netstat -ano | findstr ":{port} "',
                shell=True, text=True, stderr=subprocess.DEVNULL
            )
            pids = set()
            for line in out.splitlines():
                if "LISTENING" in line.upper():
                    parts = line.split()
                    if parts:
                        pids.add(parts[-1])
            for pid in pids:
                if pid.isdigit() and int(pid) != os.getpid():
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(["lsof", "-ti", f":{port}"], text=True)
            for pid in out.split():
                if pid.isdigit() and int(pid) != os.getpid():
                    subprocess.run(["kill", "-9", pid], capture_output=True)
        except Exception:
            pass

def open_app(url: str) -> None:
    if sys.platform == "win32":
        pf = os.environ.get("ProgramFiles", r"C:\Program Files")
        pf86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        local = os.environ.get("LOCALAPPDATA", "")
        candidates = [
            (rf"{pf86}\Microsoft\Edge\Application\msedge.exe", ["--app=" + url, "--new-window"]),
            (rf"{pf}\Microsoft\Edge\Application\msedge.exe", ["--app=" + url, "--new-window"]),
            (rf"{local}\Microsoft\Edge\Application\msedge.exe", ["--app=" + url, "--new-window"]),
            (rf"{pf}\Google\Chrome\Application\chrome.exe", ["--app=" + url, "--new-window"]),
            (rf"{pf86}\Google\Chrome\Application\chrome.exe", ["--app=" + url, "--new-window"]),
            (rf"{local}\Google\Chrome\Application\chrome.exe", ["--app=" + url, "--new-window"]),
        ]
        for exe, args in candidates:
            if os.path.isfile(exe):
                try:
                    subprocess.Popen([exe] + args, close_fds=True)
                    return
                except Exception:
                    continue
    webbrowser.open(url)

def show_progress_window():
    """Optional Tk progress window (Windows)."""
    if not updater_core:
        return
    try:
        import tkinter as tk
        from tkinter import ttk
    except Exception:
        return

    def ui():
        root = tk.Tk()
        root.title("SA Invoice Pro – Updating")
        root.geometry("420x160")
        root.resizable(False, False)
        lbl = tk.Label(root, text="Preparing…", wraplength=380, justify="left")
        lbl.pack(pady=16, padx=16)
        bar = ttk.Progressbar(root, length=360, mode="determinate")
        bar.pack(pady=8)

        def tick():
            st = updater_core.get_status()
            lbl.config(text=st.get("message") or st.get("state") or "")
            bar["value"] = st.get("progress") or 0
            if st.get("state") in ("done", "error"):
                if st.get("state") == "error":
                    lbl.config(text="Error: " + (st.get("error") or "failed"))
                root.after(2500, root.destroy)
                return
            root.after(400, tick)

        root.after(300, tick)
        root.mainloop()

    threading.Thread(target=ui, daemon=True).start()

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _only_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/self-update/status":
            if not updater_core:
                return self._json(500, {"error": "updater_core missing"})
            return self._json(200, updater_core.get_status())
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/self-update/start":
            if not self._only_local():
                return self._json(403, {"error": "Only localhost can update"})
            if not updater_core:
                return self._json(500, {"error": "updater_core.py not found next to launcher"})
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            try:
                data = json.loads(raw.decode("utf-8") or "{}")
            except Exception:
                data = {}
            server = (data.get("updateServerUrl") or "").strip()
            dl = (data.get("downloadUrl") or "").strip() or None
            if not server:
                return self._json(400, {"error": "updateServerUrl required"})
            show_progress_window()
            st = updater_core.start_update_async(ROOT, server, dl)
            return self._json(200, st)
        self.send_error(404)

def run_server():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), AppHandler)
    httpd.serve_forever()

def main():
    if not (ROOT / "index.html").exists():
        msg = f"index.html not found in:\n{ROOT}"
        if sys.platform == "win32":
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, msg, "SA Invoice Pro", 0x10)
            except Exception:
                print(msg)
        else:
            print(msg)
        sys.exit(1)

    print("SA Invoice Pro")
    print(f"  Folder: {ROOT}")
    print(f"  Resetting port {PORT}...")
    kill_port(PORT)
    time.sleep(0.6)

    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(0.5)

    url = f"http://127.0.0.1:{PORT}/"
    print(f"  Opening {url}")
    print(f"  Self-update API: POST /api/self-update/start (localhost)")
    open_app(url)

    print("  Running. Close this window to stop.")
    try:
        while True:
            time.sleep(1)
            if not t.is_alive():
                break
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
