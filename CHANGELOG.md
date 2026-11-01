## 6.47.0 — Edge reliability + license health + Tech Diagnose

- **Documents**: Tech Diagnose Report template (Hardware, 12 sections)
- **License server**: `license_health.py` + `start_license.py` registers `/health` and `/api/health`
- **Cloudflare**: `cloudflare/edge-proxy` Worker — aggregate health, proxy WA / PayFast / license API
- **Website**: `APP_LINKS.website` → https://sa-invoice-pro.pages.dev
- **saip-sync** (separate repo): 6.46.1, `/api/health`, dual `/api/whatsapp/*` routes

## 6.46.1 — Tech Diagnose Report

- Documents generator template + sections

## 6.46.0 — WhatsApp chase queue

- `/wa-chase` dual path wa.me + Cloud
