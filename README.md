# SA Invoice Pro 3.4

**Professional offline-first invoicing, job cards, payroll & accounting for South African businesses.**

Built for trades, IT support, consultants and SMEs who need clean tax invoices, job cards that convert to invoices, PAYE estimates, and PayFast — without a monthly SaaS lock-in.

## Why teams buy it

- **Get paid faster** — Tax invoices with VAT, professional PDF, WhatsApp/email share, aging & collection rate
- **Job card → invoice** — Log time on site or remote, stop the timer, convert with client, site, tech, notes and lines pre-filled
- **Quotes that close** — Convert accepted quotes to invoices in one click
- **SA payroll estimates** — 2026/27 PAYE brackets, UIF, SDL, payslip PDF + CSV (not a substitute for e@syFile)
- **Accounting lite** — Chart of accounts, journals, trial balance / P&L, bank recon helpers
- **PayFast** — Sandbox + live, EFT tracking
- **Documents** — SLA, POPIA notice, NDA lite, engagement letters
- **License-ready** — HWID handshake vendor server included
- **Offline-first** — IndexedDB local data; works when the network does not

## What’s new in 3.4

- Invoice **CSV export** (Excel-friendly UTF-8 BOM)
- **Bulk mark paid** + bulk delete on invoice list
- **Aging column** (days overdue / due today / due in N days)
- First-run **onboarding** path on Home
- **Error boundary** so one page crash does not take down the app
- Hardened ZAR money math (cent rounding)
- Job cards already convert with full template fill (v3.3.2)
- Design system from 3.0 (tokens, dark mode, density, command palette)

## Stack

React 19 · Vite 6 · jsPDF · IndexedDB · optional Node license server

## Quick start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages, Netlify, or any static host.  
License server: see `DEPLOY_LICENSE_SERVER.md` / `license_server.py`.

## Keyboard

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New invoice |
| `Ctrl+D` | Toggle theme |

## Compliance note

Payroll figures are **client-side statutory estimates** for planning only. Use SARS e@syFile / a registered tax practitioner for filings. POPIA document templates are starting points — review with counsel for your practice.

## License

Commercial product. See `LICENSE.txt` in `public/legacy/` and your purchase terms.
