# SA Invoice Pro — Owner roadmap (P1 → P10)

**Product email:** sainvoicepro@gmail.com  
**Current ship:** **6.34.0**  
**Stability rule:** mega slices only ship if unit + e2e smoke stay green.

Progress is **honest** — not marketing. Each P is a product layer; % is “good enough to sell / run a shop on”.

| Priority | Theme | % now | Target for “done” |
|----------|--------|------:|------------------:|
| **P0** | Crash blockers, CRUD basics, CI smoke | **92%** | 95% |
| **P1** | Desk CRUD everywhere (edit/delete/actions) | **88%** | 95% |
| **P2** | Invoices / quotes / payments flows | **90%** | 96% |
| **P3** | Payroll / employees / SARS helpers | **85%** | 94% |
| **P4** | Client portal + shop write-back | **93%** | 98% |
| **P5** | Bank import / recon | **80%** | 92% |
| **P6** | Multi-branch / stock / seats | **78%** | 90% |
| **P7** | Messaging (WA / SMS) | **55%** | 85% |
| **P8** | Licensing / PayFast / updates | **88%** | 96% |
| **P9** | White-label / branding / website | **70%** | 90% |
| **P10** | Scale, analytics, enterprise polish | **35%** | 80% |

**Weighted product readiness (owner view): ~82%** — alpha/beta ready; not “finished forever”.

---

## P0 — Stability (always first)

- [x] Vite `base: '/'` (deep routes load)
- [x] Playwright smoke green on portal paths
- [x] Async ConfirmDialog
- [x] Employees edit / delete / archive
- [ ] IndexedDB id migration for ancient numeric keys
- [ ] Offline queue health UI always accurate

## P1 — CRUD completeness (this ship + next)

Shipped **6.33–6.34**:

- [x] Employees: Edit · Duplicate · Archive · Delete · Actions
- [x] Products/Services: Edit · Duplicate · Delete · Actions
- [x] Expenses: Edit · Duplicate · Delete · Actions
- [x] Clients: Actions menu (existing)
- [ ] Quotes list row edit parity
- [ ] Tickets bulk status actions
- [ ] Payments void / reallocate

## P2 — Money documents

- [x] Invoice / quote PDF core
- [x] Quote → invoice convert
- [ ] Recurring invoice reliability polish
- [ ] Partial payment UX clarity
- [ ] Credit notes

## P3 — Payroll

- [x] Employee SA ID / UIF helpers
- [x] Payslip generation path
- [ ] EMP201 / IRP5 export packs
- [ ] Leave balance automation

## P4 — Portal

- [x] Multi-section portal (overview/quotes/invoices/payments/service)
- [x] Quote accept/decline
- [x] Client portal workers host
- [ ] Live Accept → desk sync always on free tier
- [ ] PIN portal + token portal unified UX

## P5 — Bank

- [x] CSV import + match helpers
- [ ] Auto-match confidence scores UI
- [ ] Multi-bank format presets

## P6 — Branches & seats

- [x] Branch stock transfer helpers
- [x] Seat / role gates (partial)
- [ ] Inter-branch transfer audit log
- [ ] Seat invites by email

## P7 — WhatsApp / SMS

- [x] Template scaffolds
- [ ] Meta Cloud API production path
- [ ] Ticket status → WA notify

## P8 — License & billing

- [x] Soft trial + license server
- [x] PayFast verification path (manual)
- [ ] Webhook auto-activate seats (no manual approve)
- [ ] Per-device subscription UX in-app

## P9 — Brand & web

- [x] White-label helpers
- [x] sa-invoice-pro-website scaffold
- [ ] Pricing + checkout live end-to-end
- [ ] Marketing site on custom domain

## P10 — Scale

- [ ] Usage analytics (privacy-safe)
- [ ] Multi-company workspaces
- [ ] API keys for accountants

---

## Feature backlog counter (100+ ideas, grouped)

Not all will ship; owner prioritizes by revenue and daily pain.

**Desk (25):** global search, keyboard shortcuts map, denser tables, bulk select, undo delete, recent screens, pinned clients, invoice templates, quote templates, price books, tax inclusive toggle, multi-currency later, attachments on tickets, photo on job card, signature on job, print shop docket, barcode SKU, low-stock alerts, reorder suggestions, vendor list, PO light, delivery notes, credit notes, refund flow, statement PDF.

**Portal (15):** PIN login polish, push notifications, pay now UX, quote PDF download, job ETA, feedback trends, multi-language ZA, dark/light, offline queue status, document upload, appointment request, chat-to-shop, invoice history export, payment proof upload, expiry reminders.

**Payroll (12):** overtime rules, leave requests, payslip email, EMP201, IRP5, directive tax, medical tax credits, bonus runs, contractor mode, department cost centres, payroll journal auto, UIF file.

**Bank (10):** FNB/STD/ABSA presets, PDF statement OCR later, rules engine, transfer detect, fees auto, VAT on fees, recon lock period, export to Excel, match undo, multi-account.

**Ops (15):** branches, transfers, seats, roles, audit log, backup remind, cloud restore, conflict UI, device list, session revoke, POPIA export, POPIA erase, consent log, retention policy, support mode.

**Growth (15):** referral codes, affiliate, in-app changelog, roadmap votes, NPS, trial extend, coupon, annual plan, family plan, white-label domain, custom SMTP, WA templates store, SMS packs, partner accountants, marketplace later.

**Quality (15):** e2e desk CRUD, e2e payroll, visual regression, unit tax engine, unit VAT, performance budget, a11y pass, offline e2e, SW update UX, error telemetry opt-in, feature flags, staged rollout, kill switch, data integrity check, migrate wizard.

---

## How we run “godmode” without breaking the shop

1. **P0 always green** (smoke + unit + build).
2. **One mega theme per ship** (e.g. CRUD, portal, license) — not 50 random edits.
3. **% only moves when users can feel it** in the desk app.
4. Next mega candidates: **P1 finish (quotes/tickets/payments actions)** → **P8 PayFast webhook** → **P7 WA notify**.

---

## Shipped recently

| Ver | Focus |
|-----|--------|
| 6.34.0 | Products + Expenses edit/Actions; this roadmap |
| 6.33.0 | Employees full CRUD |
| 6.32.0 | FAB / chrome cleanup |
| 6.31.x | License / PayFast direction |
