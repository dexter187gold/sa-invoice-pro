## 6.49.0 — Smart WhatsApp replies

- **Inbox**: Paste inbound client message → **Smart suggest** (local keyword match) fills a ZA-tone reply. No network needed.
- **QUICK_REPLIES** expanded: FRP/Google lock, screen crack, battery swap, data recovery, ETA, warranty note.
- Desk responds faster to common bench enquiries while staying on the app (Cloud or wa.me).

## 6.48.0 — WhatsApp desk replies

- **Inbox**: Expanded QUICK_REPLIES — ready for collection, waiting on parts, quote follow-up, payment received, bring ID + accessories, price/diagnose next, booking confirmed (ZA tone).
- Desk can respond to pending WhatsApp clients faster without leaving the app (Cloud or wa.me).

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
