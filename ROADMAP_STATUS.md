# SA Invoice Pro — Owner roadmap

**Ship:** **6.49.0** · **Weighted readiness ≈ 95%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / CI | **97%** |
| P7 WhatsApp | **94%** |
| P8 License/PayFast | **88%** |
| Docs / IT templates | **92%** |

### 6.49.0 done
- Inbox smart suggest: paste inbound WA text → local keyword match fills best ZA-tone reply
- Bench quick replies: FRP, screen, battery, data recovery, ETA, warranty

### 6.48.0 done
- Inbox QUICK_REPLIES expanded for bench responses (ready, parts, quote, payment, bring ID, estimate, booking)
- ZA-tone templates for faster WhatsApp replies from the desk

### 6.47.0 done
- Tech Diagnose Report in Documents
- License `/health` module + start_license wiring
- Cloudflare edge-proxy Worker scaffold
- saip-sync 6.46.1 dual WA paths + `/api/health`
- Website link: sa-invoice-pro.pages.dev

### Your deploy checklist
1. Render: redeploy **saip-license** with `start_license.py` (picks up `/health`)
2. Cloudflare: `cd cloudflare/edge-proxy && npx wrangler deploy`
3. Set Meta webhook to edge or `https://saip-sync.onrender.com/api/whatsapp/webhook`
