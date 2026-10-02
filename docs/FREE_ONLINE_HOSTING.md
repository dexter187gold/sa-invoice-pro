# Free / low-cost ways to run SA Invoice Pro fully online

## Split (important)

| Part | What it is | Free options |
|------|------------|--------------|
| **A. Client UI** (HTML/JS/CSS PWA) | Static files | Cloudflare Pages, Netlify, GitHub Pages, Vercel |
| **B. License + Update servers** | Python Flask | Render free, Railway trial, Fly.io free allowance, Oracle Cloud always-free VM, PythonAnywhere |
| **C. File upload deploy** | FTP/SFTP | Any free web host FTP (InfinityFree, some cPanel free tiers) — **static only** |

Your **business data** still lives in each user’s browser (IndexedDB) unless you later add a real database backend.

---

## Recommended free stack (2026)

### 1) Client app – Cloudflare Pages (best free static)
1. Push repo to GitHub  
2. Cloudflare Dashboard → Pages → Connect repo  
3. Build: none (static). Output folder: `/` or project root  
4. HTTPS URL like `https://sa-invoice.pages.dev`

### 2) License + Updates – Render.com free web services
1. https://render.com → New Web Service → connect GitHub  
2. Two services (or one if you merge later):
   - `license_server.py` port **5055**
   - `update_server.py` port **5056**
3. Start command: `pip install flask && python license_server.py`  
4. Set env `PORT` if required — may need small code bind to `os.environ['PORT']` (see `deploy/cloud_port.py` pattern in servers)

**Note:** Free Render services **spin down** after idle; first request can be slow. For true 24/7 free, prefer **Oracle Cloud always-free ARM VM** + Docker.

### 3) FTP static deploy (InfinityFree / classic hosting)
- Use `deploy/ftp_deploy.py` to upload `index.html`, `css/`, `js/`, `libs/`, `icons/`, `manifest.json`, `sw.js`
- **Cannot** run Flask on pure FTP shared hosting
- Point clients to your `https://yourdomain/...` for the **UI only**; still need cloud for license/update

### 4) Oracle Cloud Always Free VM (best “always on” free)
- Free Ampere VM, install Docker, run `deploy/docker-compose.yml`
- Attach reserved public IP + Cloudflare DNS + HTTPS

---

## What “100% online” means here

- Users open the app from an **HTTPS URL** (not only localhost)  
- License/update work when **your laptop is off**  
- App still works **offline for invoicing** after first load (PWA)

It does **not** mean free unlimited SARS integration or a multi-tenant SaaS database out of the box.
