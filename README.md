# SA Invoice Pro 3.11

**Professional offline-first invoicing, job cards, payroll & accounting for South African businesses.**

Built for trades, IT support, consultants and SMEs who need clean tax invoices, job cards that convert to invoices, PAYE estimates, and PayFast — without a monthly SaaS lock-in.

## Why teams buy it

- **Get paid faster** — Tax invoices with VAT, professional PDF, aging, bulk mark paid, CSV export
- **Job card → invoice** — Timer, convert with client, site, tech, notes and lines pre-filled
- **Quotes that close** — Convert fills the invoice template in one click
- **Reports pack** — Summary, invoices, aged debtors, expenses, payments CSVs (Excel ZA)
- **SA payroll estimates** — 2026/27 PAYE, UIF, SDL, ETI, payslip PDF + CSV (not e@syFile)
- **Accounting lite** — CoA, journals, trial balance CSV, bank recon helpers
- **PayFast** — Sandbox + live, EFT tracking
- **Documents** — SLA, POPIA, NDA lite, engagement letters
- **License-ready** — HWID handshake + vendor server
- **Offline-first** — IndexedDB; works when the network does not

## Recent releases (3.4 → 3.11)

- Design system, ErrorBoundary, onboarding, money cent-safe math
- Invoice aging + bulk actions; quote/job-card convert banners
- CSV exports across invoices, clients, products, expenses, payments, employees, payroll, accounting
- Reports 5-file export pack; Settings backup timestamp; License activation steps
- Mobile + print CSS; accessibility focus rings; command palette “Job cards”
- Login/Setup sales polish; SEO meta (`en-ZA`)

## Stack

React 19 · Vite 6 · jsPDF · IndexedDB · optional Python license server

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages, Netlify, or any static host.  
License server: `DEPLOY_LICENSE_SERVER.md` / `license_server.py`.

## Keyboard

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New invoice |
| `Ctrl+D` | Toggle theme |

## Compliance note

Payroll figures are **client-side statutory estimates** for planning only. Use SARS e@syFile / a registered tax practitioner for filings. POPIA templates are starting points — review with counsel.

## License

Commercial product. See `LICENSE.txt` in `public/legacy/` and your purchase terms.
