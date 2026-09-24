# Cloudflare Pages + Render (click path)

## Architecture

```
Users  →  https://YOUR-APP.pages.dev          (UI – Cloudflare Pages)
       →  https://sa-license.onrender.com     (license – Render)
       →  https://sa-updates.onrender.com     (updates – Render)
```

Your PC can be offline. Free Render apps **sleep after ~15 min idle**; first request may take 30–60s.

---

## Part 1 – GitHub (once)

1. Create a GitHub account / repo, e.g. `sa-invoice-pro`.
2. Upload the **contents** of `sa-invoice-v1` (index.html, js, css, license_server.py, update_server.py, …).
3. Commit and push to `main`.

---

## Part 2 – Render: license server

1. Go to [https://render.com](https://render.com) → Sign up (GitHub login).
2. **Dashboard → New → Web Service**.
3. Connect the `sa-invoice-pro` repo.
4. Settings:
   - **Name:** `sa-invoice-license`
   - **Language:** Python 3
   - **Root directory:** leave blank (or folder if repo is nested)
   - **Build command:** `pip install flask`
   - **Start command:** `python license_server.py`
   - **Instance type:** Free
5. **Advanced → Add environment variable** (optional): not required; Render sets `PORT` automatically. The app reads `PORT`.
6. Create Web Service → wait until status is **Live**.
7. Copy the URL, e.g. `https://sa-invoice-license.onrender.com`  
   Open it in a browser – you should see the license server UI or a response (not “Not Found” on `/`).

**Test:**  
`https://sa-invoice-license.onrender.com/`  

---

## Part 3 – Render: update server

1. **New → Web Service** again (same repo).
2. Settings:
   - **Name:** `sa-invoice-updates`
   - **Build command:** `pip install flask`
   - **Start command:** `python update_server.py`
   - **Free** instance
3. Deploy → copy URL, e.g. `https://sa-invoice-updates.onrender.com`
4. Open that URL – you should see the **Update Server** page.
5. Publish a version:
   - Version: `3.1.0`
   - Download URL: link to your GitHub Release ZIP **or** leave blank until you host a zip
   - Token: `sa-owner-2026`
6. Optional: on a paid/disk plan you can store files; on free, prefer **GitHub Releases** as `downloadUrl`.

**Test:**  
`https://sa-invoice-updates.onrender.com/api/latest`  
Should return JSON with `"version": ...`.

---

## Part 4 – Cloudflare Pages: client UI

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select `sa-invoice-pro`.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(empty)*
   - **Build output directory:** `/`  
     If the app is in a subfolder, use that folder name instead (e.g. `sa-invoice-v1`).
4. **Save and Deploy**.
5. Copy URL: `https://sa-invoice-xxxx.pages.dev`

### After first deploy – point UI at Render

Edit **`js/config.js`** in the repo:

```js
defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
defaultUpdateServerUrl: 'https://sa-invoice-updates.onrender.com',
```

Commit + push → Pages auto-redeploys.

Or on each device: **About** → set Update server URL; **License** → set License server URL to the Render HTTPS links (**no port numbers** on Render URLs).

---

## Part 5 – Client checklist

| Setting | Value |
|--------|--------|
| License server URL | `https://sa-invoice-license.onrender.com` |
| Update server URL | `https://sa-invoice-updates.onrender.com` |
| Open app | `https://YOUR.pages.dev` |

Do **not** use `127.0.0.1` or `:5055` / `:5056` in production URLs.

---

## CORS

Servers already send `Access-Control-Allow-Origin: *` so the Pages origin can call Render.

---

## Sleeping free tier

If license/update “fail” after hours unused:

1. Open the Render URL once in a browser (wakes the service).
2. Retry in the app.
3. For fewer sleeps → Oracle free VM or Render paid.

---

## GitHub Release as download ZIP

1. GitHub repo → **Releases** → **Draft a new release**  
2. Tag `v3.1.0`, upload `sa-invoice-v3.1.0.zip`  
3. Copy the asset URL into Render update **downloadUrl** when publishing.
