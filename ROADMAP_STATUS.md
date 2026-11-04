# SA Invoice Pro — Owner roadmap

**Ship:** **6.51.0** · **Weighted readiness ≈ 96%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / CI | **97%** |
| P3 Money loop | **88%** |
| P4 Client portal | **86%** |
| P7 WhatsApp | **96%** |
| P8 License / monetisation | **88%** |
| Docs / IT templates | **94%** |

### 6.51.0 done — Professional Pay Now foundation
- Server: `payments-store.js` + `routes/payments.js` (init / verify / webhook / config)
- Portal: Pay Now button on unpaid invoices, Paystack Inline, verify + thank-you, toast
- Dual-rail structure ready (Paystack primary, PayFast later)
- Roadmap + Instructions aligned

### Your next actions (owner)
1. Create / verify **Paystack** business account with **sainvoicepro@gmail.com**
2. On **saip-sync** (or local server): set env  
   `PAYSTACK_PUBLIC_KEY=pk_…`  
   `PAYSTACK_SECRET_KEY=sk_…`
3. In Paystack dashboard → Settings → Webhooks:  
   `https://saip-sync.onrender.com/api/portal/pay/webhook`
4. Redeploy server, open a test portal invoice, click **Pay Now**

### 6.50.0 done
- Inbox: paste inbound WA text → Smart suggest (local keyword match) fills best ZA-tone reply
- Bench quick replies expanded: FRP, screen, battery, data, warranty, ETA

### Deploy checklist
1. Render: redeploy **saip-license** + **saip-sync** (with new Paystack env vars)
2. Cloudflare: `cd cloudflare/edge-proxy && npx wrangler deploy` (if proxying payments)
3. Client portal: redeploy Pages / Workers if static assets changed
4. Set Meta webhook to edge or `https://saip-sync.onrender.com/api/whatsapp/webhook`
