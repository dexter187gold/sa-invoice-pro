# SA Invoice Pro 6.18.0

**Sell-ready offline-first invoicing for South African IT / mobile repair / MSP benches.**

Tax invoices · job cards → invoice · quotes · client portal approve · payroll estimates · accounting · PayFast · POPIA documents — without a monthly SaaS lock-in.

## Why buyers choose it

| Capability | What you get |
|------------|----------------|
| **Get paid** | VAT tax invoices, professional PDF, aging, bulk mark paid, CSV, chase pack |
| **Job cards** | Timer, device passport, FRP checklist, convert → invoice |
| **Quotes** | One-click convert · **client portal Accept / Decline** |
| **Bank match** | FNB/SBSA/ABSA/Nedbank CSV · confidence + reason chips |
| **Reports** | CSV pack + cash forecast 30/60/90 + quote win-rate |
| **Payroll** | 2026/27 PAYE · UIF · SDL · ETI estimates + payslip PDF (not e@syFile) |
| **Books** | SA chart of accounts, journals, trial balance CSV |
| **PayFast** | Sandbox + live, plus EFT logging |
| **Documents** | SLA, POPIA, NDA lite, engagement letters |
| **License** | HWID handshake + vendor activation server |
| **Offline** | IndexedDB workspace + load-shedding outbound queue |

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

Product contact: **sainvoicepro@gmail.com**

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
