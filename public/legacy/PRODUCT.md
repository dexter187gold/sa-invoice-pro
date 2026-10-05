# SA Invoice Pro — Product information

**Version:** 1.0.0 (first stable release)  
**Product:** SA Invoice Pro  
**Copyright:** © 2026 SA Invoice Pro. All rights reserved.  
**Market:** South Africa (VAT, CIPC-oriented profiles, ZAR)

## What it is
Offline-first Progressive Web App for invoicing, quotes, job cards/tickets,
clients, expenses, light accounting, payroll helpers, and POPIA-oriented tools.

## Key features (1.0.0)
- Company setup by business type with industry sample data
- Invoices, quotes, credit notes, PDF generation
- Clients hub with open/resolved job cards per client
- Job cards / tickets with **sub-job cards**
- WhatsApp & email share (device apps) + EFT payment text (Capitec/your bank)
- Accounting: bank recon helpers, CoA, VAT helper, calculator tools
- License handshake with owner server; update channel
- Multi-theme UI; mobile + desktop

## Payments to your Capitec (or any bank)
1. Settings / company profile → enter **Bank name** (e.g. Capitec), **account number**, **branch code**.
2. Those details appear on client hub and in invoice email/WhatsApp payment text.
3. Clients pay by **EFT** using invoice number as reference.
4. Record payments in-app under invoice payment history.
   (Card gateways / Capitec API instant pay are not in 1.0.0; EFT is the stable path.)

## Deploy (go live)
- **Frontend:** Cloudflare Pages or GitHub Pages from this repo root (`index.html`).
- **License/update APIs:** Render (or your VPS) running `license_server.py` / `update_server.py`.
- Clear CDN/browser cache after deploy; confirm version **1.0.0** on the login card.

## Support
In-app About / License. Keep your owner token and server URLs private.

## Capitec / EFT payments (1.0.1)

1. **Company profile** → Bank name `Capitec`, account holder, account number, branch code (confirm on Capitec Business; many use universal branch **470010** — verify yours).
2. On any **unpaid invoice** click **EFT** → panel with bank details, **Copy**, **WhatsApp**, **Email**.
3. Client pays in Capitec (or any bank) app by EFT using **invoice number as reference**.
4. When money reflects, open **Pay** (payment history) and record the payment.

This is **direct to your bank account** (no middleman). Card “Pay now” buttons need a gateway (PayFast/Ozow) that settles into the same Capitec account — optional future add-on.
