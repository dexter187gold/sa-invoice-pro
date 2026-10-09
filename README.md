# SA Invoice Pro 3.0.0

Professional offline-first invoicing for South Africa — React 19 + Vite 6.

## What’s new in 3.0

- **Design system overhaul** — refined colour tokens, typography, spacing, shadows, radius scale
- Tighter sidebar, segmented controls, density modes, improved dark theme
- Polished cards, tables, badges, buttons, modals, command palette
- Stronger focus states, reduced-motion support, print styles
- Same full feature set as 2.x (payroll, accounting, tickets, PayFast, license, etc.)

## Features

- Auth (register / login), company setup
- Home + Dashboard (aged debtors, KPIs, collection rate)
- Clients, Products & services, Invoices (PDF, payments, WhatsApp/email)
- Quotes → convert to invoice
- Tickets (classic + Helix embed)
- Expenses, Payments (EFT + PayFast), Employees (UIF, SA ID Luhn)
- **Payroll** — 2026/27 PAYE brackets, UIF, SDL, payslips PDF + CSV
- Accounting (CoA, bank recon, journals, TB/P&L)
- Reports, document generator (SLA, POPIA, letters…)
- License (HWID, handshake), Settings, backup/restore
- Online/offline, dark mode, density (compact / comfortable)
- **Command palette** (Ctrl+K), Ctrl+N new invoice, Ctrl+D theme
- `public/legacy/` — full classic app fallback

## Payroll note

Client-side statutory **estimates** only (tax year 2026/27). Not a substitute for SARS e@syFile or a registered tax practitioner.

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

## Keyboard

- `Ctrl/Cmd+K` — command palette
- `Ctrl/Cmd+N` — new invoice
- `Ctrl/Cmd+D` — toggle theme
- `Ctrl/Cmd+/` — assistant
