# Automatic in-folder updates

Browsers cannot write into your app folder. The **launcher** (`Start-SA-Invoice.bat` → `launcher.py`) can.

## How it works

1. Owner publishes ZIP on update server (`releases/` + Publish).
2. Client (started with **Start-SA-Invoice.bat**) → About → Check for updates.
3. Click **Install automatically**.
4. Browser calls `http://127.0.0.1:8080/api/self-update/start`.
5. Launcher downloads the ZIP, extracts, **overwrites/creates files** in the app folder.
6. Progress in-app + optional desktop progress window.
7. Page reloads with new files.

## Requirements

- App must be started via **Start-SA-Invoice.bat** / launcher (not a random static host without updater_core).
- `updater_core.py` next to `launcher.py`.
- Update server reachable; `downloadUrl` works (e.g. `http://127.0.0.1:5056/releases/...zip`).

## Same PC test

1. Start-Update-Server.bat
2. Start-SA-Invoice.bat
3. Publish new version with download URL
4. About → Check → Install automatically
