# How to push an update to clients (e.g. 2.0.1 or 2.0.2)

## What clients need (one-time)

1. App installed/extracted on their PC.
2. **About / Updates** → **Update server URL** =
   - Same LAN: `http://YOUR-PC-LAN-IP:5056`
   - Example: `http://192.168.0.174:5056`
3. Save. On next start (or **Check for updates**) the app asks your update server for `version.json`.

You (owner) run **`Start-Update-Server.bat`** (or `python update_server.py`) on a PC that stays reachable.

## Steps to push 2.0.1 (or any ZIP)

1. **Build / copy the release ZIP**  
   e.g. `sa-invoice-v2.0.1.zip`

2. **Host the ZIP somewhere clients can download**
   - Your own HTTPS site, or
   - Google Drive / Dropbox **direct download** link, or
   - A shared folder URL on your network  
   Put that full URL in `downloadUrl`.

3. **Publish on the update server**

   Option A – Web UI  
   - Open `http://127.0.0.1:5056/`  
   - Version: `2.0.1`  
   - Message: short note  
   - Download URL: paste the ZIP link  
   - Mandatory: `false` (or `true` if they must update)  
   - Owner token: `sa-owner-2026`  
   - **Publish**

   Option B – Edit `version.json` next to `update_server.py`:
   ```json
   {
     "version": "2.0.1",
     "message": "Auth flow, Home vs Dashboard, logo",
     "mandatory": false,
     "downloadUrl": "https://example.com/sa-invoice-v2.0.1.zip",
     "changelog": ["…"]
   }
   ```
   Restart update server if it was already running.

4. **Client side**
   - Opens app → silent check, or **About → Check for updates**
   - Sees “Update available” with **Download update**
   - Downloads ZIP → extracts over/alongside old folder → restarts app  
   (This channel does **not** silently overwrite files; user installs the ZIP.)

## Ports

| Service        | Port |
|----------------|------|
| App            | 8080 |
| License server | 5055 |
| Update server  | 5056 |

Firewall: allow **5056** inbound if clients are on other PCs.

## Mandatory updates

Set `"mandatory": true` in publish. Client still must download/apply the ZIP; the app can nag harder. Fully forced silent install needs a future installer service.

## Owner token

Default: `sa-owner-2026`  
Override: environment variable `SA_OWNER_TOKEN`.

## Without uploading to Drive / public internet

Host the ZIP **on the update server itself**:

1. Copy `sa-invoice-v2.0.1.zip` into the app folder:

   ```
   sa-invoice-v1/releases/sa-invoice-v2.0.1.zip
   ```

2. Start `Start-Update-Server.bat`

3. Publish with Download URL =

   ```
   http://127.0.0.1:5056/releases/sa-invoice-v2.0.1.zip
   ```

   Clients on the **same Wi‑Fi** use your PC’s LAN IP:

   ```
   http://192.168.x.x:5056/releases/sa-invoice-v2.0.1.zip
   ```

4. Clients only need the **update server URL** (`http://192.168.x.x:5056`).  
   They never need Google Drive or a public website.

Other options without a link host:

| Method | Notes |
|--------|--------|
| **USB / shared folder** | You copy the ZIP manually — no push notification |
| **Update server LAN** | Best automatic *notify + download* on your network |
| **Email the ZIP** | Manual; no in-app prompt |

Browsers cannot silently install into Program Files without an installer service; the client still extracts the ZIP once downloaded.
