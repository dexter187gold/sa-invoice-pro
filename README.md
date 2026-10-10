# SA Invoice Pro 4.1

**Sell-ready offline-first invoicing for South African businesses.**

Tax invoices · job cards → invoice · quotes · payroll estimates · accounting · PayFast · POPIA documents — without a monthly SaaS lock-in.

## Why buyers choose it

| Capability | What you get |
|------------|----------------|
| **Get paid** | VAT tax invoices, professional PDF, aging, bulk mark paid, CSV |
| **Job cards** | Timer, convert fills client / site / tech / notes / lines |
| **Quotes** | One-click convert into a complete invoice template |
| **Reports** | 5-file CSV pack (summary, invoices, aged AR, expenses, payments) |
| **Payroll** | 2026/27 PAYE · UIF · SDL · ETI estimates + payslip PDF (not e@syFile) |
| **Books** | SA chart of accounts, journals, trial balance CSV |
| **PayFast** | Sandbox + live, plus EFT logging |
| **Documents** | SLA, POPIA, NDA lite, engagement letters |
| **License** | HWID handshake + vendor activation server |
| **Offline** | IndexedDB workspace — works when the network does not |

## What’s in 4.1

- **Load demo data** (Settings → Backup) for sales walkthroughs
- **WhatsApp + Email** share from invoice editor

## What’s in 4.0

Built on the 3.4–3.12 commercial train:

- Design system, dark mode, density, command palette (`Ctrl+K`)
- Error boundary, onboarding, mobile + print styles, accessibility focus rings
- Job-card and quote → invoice template fill with clear banners
- CSV exports across sales, ops, payroll, and accounting
- License activation steps, backup last-download time
- Version alignment across app, `version.json`, and runtime config

## Stack

React 19 · Vite 6 · jsPDF · IndexedDB · optional Python license server

## Quick start

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Deploy `dist/` to Cloudflare Pages, Netlify, or any static host.  
License server: `DEPLOY_LICENSE_SERVER.md` · `license_server.py`.

## Keyboard

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New invoice |
| `Ctrl+D` | Toggle theme |

## Compliance

Payroll figures are **client-side statutory estimates** for planning only. Use SARS e@syFile or a registered tax practitioner for filings. POPIA templates are starting points — review with counsel.

## License

Commercial product. See `LICENSE.txt` in `public/legacy/` and your purchase terms.
