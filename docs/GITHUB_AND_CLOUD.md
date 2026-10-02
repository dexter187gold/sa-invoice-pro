# Get SA Invoice Pro online (GitHub + cloud servers)

## Important architecture

| Piece | Runs where | Needs 24/7? |
|-------|------------|-------------|
| **Client app** (invoicing UI) | User PC / PWA | No – works offline (IndexedDB) |
| **License server** | Cloud VPS / Railway / Render | **Yes** – so you can go offline |
| **Update server** | Same cloud | **Yes** – push updates without your PC |
| **Owner dashboard** | Same cloud | Optional |
| **GitHub** | Source + Release ZIPs | Hosts code & downloadable builds |

**GitHub Pages cannot run Flask.** Use GitHub for code/releases; run Python servers on a VPS or PaaS.

---

## Step A – GitHub

1. Create repo (e.g. `sa-invoice-pro`).
2. Push the `sa-invoice-v1` folder contents.
3. Create a **Release** and attach `sa-invoice-v3.0.0.zip`.
4. Clients can download the ZIP from Releases (or your update server mirrors it).

```bash
git init
git add .
git commit -m "SA Invoice Pro 3.0.0"
git branch -M main
git remote add origin https://github.com/YOURUSER/sa-invoice-pro.git
git push -u origin main
```

---

## Step B – Cloud servers (you offline, clients still license/update)

### Option 1 – VPS (DigitalOcean / Hetzner / AWS Lightsail)

```bash
# On Ubuntu VPS
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx certbot
# copy project to /opt/sa-invoice
cd /opt/sa-invoice/deploy
docker compose up -d
```

Put **nginx + HTTPS** in front (see `NGINX_OWNER_CLOUD.md`).

### Option 2 – Railway / Render / Fly.io

- New Web Service from GitHub
- Start command examples:
  - `pip install flask && python license_server.py`
  - Separate services for ports 5055 / 5056 / 5060
- Set public HTTPS URLs

### Option 3 – One cheap always-on PC / Raspberry Pi at office

Same Docker compose; use Dynamic DNS if no static IP.

---

## Step C – Point clients at cloud

In each client app **About / License**:

- License server URL: `https://license.yourdomain.co.za` (or Railway URL)
- Update server URL: `https://updates.yourdomain.co.za`

Or edit `js/config.js`:

```js
defaultLicenseServerUrl: 'https://license.yourdomain.co.za',
defaultUpdateServerUrl: 'https://updates.yourdomain.co.za',
```

---

## What stays offline-capable

Invoices, clients, PDF generation, local password login work **without internet**.  
Only **license handshake** and **update check** need the cloud servers.

---

## Checklist for “zero errors when I’m offline”

- [ ] License + update on VPS with `restart: unless-stopped`
- [ ] HTTPS (Let’s Encrypt)
- [ ] Clients saved cloud URLs (not `127.0.0.1`)
- [ ] ZIP published on update server `releases/`
- [ ] GitHub Release for manual download fallback
