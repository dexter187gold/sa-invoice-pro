# Secure Render API keys + GitHub Actions CI/CD

## Never do this

- Put API keys in `index.html`, `config.js`, or workflow YAML as plain text  
- Commit `.env` or `users.json` with secrets  
- Leave default token `sa-owner-2026` on a **public** production server  

## 1) Strong owner token (Render)

1. Generate a long random string (password manager), e.g. 32+ characters.  
2. Render Dashboard → **sa-invoice-license** → **Environment** → Add:
   - `SA_OWNER_TOKEN` = your secret  
   - `SA_REQUIRE_SECRETS` = `1`  
3. Same variables on **sa-invoice-updates**.  
4. Save → service redeploys.  
5. When publishing updates, use **that same token** (not `sa-owner-2026`).

## 2) Render API key (for GitHub to trigger deploys)

1. Render → Account Settings → **API Keys** → Create  
2. Copy key once (`rnd_...`)  
3. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | Value |
|-------------|--------|
| `RENDER_API_KEY` | `rnd_...` from Render |
| `RENDER_LICENSE_SERVICE_ID` | `srv-...` from license service URL / settings |
| `RENDER_UPDATES_SERVICE_ID` | `srv-...` from updates service |

**Service ID:** open the service in Render → URL looks like  
`https://dashboard.render.com/web/srv-xxxxxxxxxxxxx` → id is `srv-xxxxxxxxxxxxx`.

## 3) GitHub Actions workflows (already in repo)

| File | What it does |
|------|----------------|
| `.github/workflows/ci.yml` | On every push: JS/Python syntax check, blocks committed `.env` |
| `.github/workflows/release.yml` | On tag `v*`: builds ZIP + GitHub Release |
| `.github/workflows/deploy-render.yml` | On server file changes: calls Render API to deploy |

### Enable CI/CD

1. Push these workflow files to `main`.  
2. Add the three secrets above.  
3. **Actions** tab → workflows appear.  
4. Change `license_server.py` → push → **Deploy Render** job runs.  

### Create a release

```bash
git tag v3.2.0
git push origin v3.2.0
```

Actions builds `sa-invoice-v3.2.0.zip` on the Release page.

## 4) Cloudflare Pages

Pages deploys from Git automatically — no Render API key needed.  
Do **not** put `SA_OWNER_TOKEN` in Pages env (browser-visible if misused).  
Only public URLs in `js/config.js`.

## 5) Rotate a leaked key

1. Render → create new API key → delete old  
2. Update GitHub secret `RENDER_API_KEY`  
3. Change `SA_OWNER_TOKEN` on both services  
4. Update any local notes / password manager  

## 6) Local dev

```bash
# Windows PowerShell example
$env:SA_OWNER_TOKEN="my-dev-token"
python update_server.py
```

Or copy `.env.example` → `.env` (gitignored) and load manually.
