# Vendor License Server (creator only) – v1.4 handshake

## Run
```bash
pip install flask
python server.py
```
Open **http://127.0.0.1:5055/**

## Flow
1. **Client PC** – License page:
   - Save server URL (`http://YOUR-IP:5055`)
   - **Get / show HWID** (enables Request / Claim / Activate)
   - **Request license from server**
2. **Your server GUI**:
   - See pending request with HWID
   - Click **Issue 7-day trial** / Standard / Pro / Lifetime
3. **Client PC**:
   - **Claim issued key** → status becomes Licensed
   - Or paste key manually and **Activate** after HWID is loaded

## API
- `POST /api/request` `{ hwid, plan, company }`
- `POST /api/claim` `{ hwid }` → `{ key }`
- `POST /api/heartbeat` status check-in
