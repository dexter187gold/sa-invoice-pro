# SA Invoice Pro — Owner roadmap

**Ship:** **6.50.0** · **Weighted readiness ≈ 95.5%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / CI | **97%** |
| P3 Money loop | **82%** |
| P4 Client portal | **78%** |
| P7 WhatsApp | **96%** |
| P8 License / monetisation | **88%** |
| Docs / IT templates | **93%** |

### Current focus (active slice)
**Professional payments foundation**
- Paystack set as primary payment rail (with PayFast as strong secondary)
- Roadmap elevated: P3.11 / P3.12 + P4.3 rewritten for premium Pay Now experience
- Next: Payment Pages pilot → portal Inline JS + webhook auto-mark-paid

### 6.50.0 done
- Inbox: paste inbound WA text → Smart suggest (local keyword match) fills best ZA-tone reply
- Bench quick replies expanded: FRP, screen, battery, data, warranty, ETA

### 6.49.0 done
- Inbox smart suggest: paste inbound WA text → local keyword match fills best ZA-tone reply
- Bench quick replies: FRP, screen, battery, data recovery, ETA, warranty

### 6.48.0 done
- Inbox QUICK_REPLIES expanded for bench responses (ready, parts, quote, payment, bring ID, estimate, booking)
- ZA-tone templates for faster WhatsApp replies from the desk

### Your deploy checklist
1. Render: redeploy **saip-license** with `start_license.py` (picks up `/health`)
2. Cloudflare: `cd cloudflare/edge-proxy && npx wrangler deploy`
3. Set Meta webhook to edge or `https://saip-sync.onrender.com/api/whatsapp/webhook`
4. **New:** Create / verify Paystack business account (sainvoicepro@gmail.com) and enable Instant EFT + cards
