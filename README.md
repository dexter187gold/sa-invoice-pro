# SA Invoice Pro 2.0.1 (modern React + full feature pack)

React 19 + Vite 6 rewrite with core **and** extended modules from classic SA Invoice Pro.

## Features in this build

- Auth (register / login), company setup
- Home + Dashboard (aged debtors, KPIs)
- Clients, Products & services (stock), Invoices (PDF, payments, WhatsApp/email)
- Quotes → convert to invoice
- Tickets (classic + Helix embed)
- Expenses, Payments (EFT + PayFast), Employees (UIF flag)
- Accounting (CoA seed, bank recon, journals, auto-post, TB/P&L)
- Reports + CSV export
- Document generator (SLA, POPIA, letters…)
- License (HWID, handshake, activate)
- Settings (company, VAT, PayFast, backup/restore)
- Online/offline indicator, dark mode
- `public/legacy/` — full 1.0.18 static app fallback

## Deploy

```bash
npm install
npm run build
```

Cloudflare Pages: build `npm run build`, output `dist`.

Render: deploy `license_server.py` as before.

## Local

```bash
npm install && npm run dev
```
