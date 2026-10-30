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


---

## Verified delivery checkpoint — 2026-10-30 (v6.37.0)

This checkpoint supersedes the older ship/version figures above for current delivery tracking. Historical percentages above are retained as a record and must not be treated as current verified readiness.

### Confirmed merged on main

- [x] Bank import cannot bulk-post suggested invoice payments; positive customer credits require individual review and confirmation.
- [x] Bank-line fingerprint protection prevents duplicate application of an imported transaction.
- [x] Invoice payment posting/deletion and related invoice/journal updates are atomic and retry-safe (PR #24).
- [x] Overpayment guards reject invoice overpayments and preserve excess bank credits for explicit review.
- [x] Read-only financial integrity scan and evidence-based historical Paid-status repair are available; repair remains owner-confirmed and evidence-gated.
- [x] Owner command centre and tenant-scoped client portal administration UI are present.
- [x] Android PWA launch improvements and Pixel-sized mobile smoke coverage are present.
- [x] Petty-cash register/ledger, modern forest-green sign-in, and customer account categories are present (PR #23).
- [x] Version-driven GitHub release automation merged (PR #25).
- [x] Application package version is 6.37.0.

### In progress / not yet accepted as complete

- [ ] **Mobile navigation:** PR #27 separates the bottom-left Main Menu from the bottom-right Command Centre. Merge only after CI, build and mobile E2E pass; verify no duplicate/confusing top-bar controls.
- [ ] **Backup and disaster recovery:** local auto-backup restore currently calls import with `wipe: false`, so it merges rather than replacing the workspace with a point-in-time snapshot. Implement validated preview, pre-restore rollback snapshot, explicit destructive confirmation, safe restore semantics and isolated restore verification. Never test destructive restore against production.
- [ ] **Financial recovery:** complete statement reconciliation for partial payments, overpayments, transfers, refunds, fees and reversals; verify audit/reversal behaviour and repair the user's affected historical invoice data only from trustworthy evidence.
- [ ] **Manual payment integrity:** verify duplicate-submit/retry behaviour for every manual payment entry path, not only bank imports.
- [ ] **PayFast:** verify server-side ITN signature, merchant/amount/currency/status checks, replay protection, idempotency and licence activation against PayFast sandbox and production-safe test cases. A code path alone is not proof of a successful live settlement.
- [ ] **Passkeys / Android biometrics:** issue #18 remains a delivery gate. Complete WebAuthn registration/authentication, challenge expiry/replay/origin/RP validation, account isolation, recovery and real Android device/browser tests. Never store biometric templates.
- [ ] **Owner and client access:** verify owner/staff boundaries and cross-client tenant isolation against real cloud-backed test accounts, including direct API attempts.
- [ ] **Payroll layouts:** finish and verify reference, simplified and detailed payslip layouts against the supplied template, with deterministic totals, South African formatting, print pagination and Playwright coverage.
- [ ] **Release/production verification:** verify clean-checkout unit tests, build, Playwright E2E (including Android viewport), Cloudflare preview, production deployment of the exact tested commit, production smoke checks and rollback instructions.
- [ ] **Operational hardening:** close remaining sync/offline queue visibility, schema migration, backup checksum/retention, dependency/secret scanning and disaster-recovery runbook gates.

### 100% completion rule

A roadmap item is complete only when all applicable evidence exists:
1. implementation is merged to `main`;
2. unit tests and relevant Playwright E2E pass from CI;
3. server-side authorization and tenant-isolation tests pass for privileged/data-scoped features;
4. preview deployment is healthy;
5. the exact tested commit is deployed to the intended production target;
6. production smoke checks pass without data loss or regression; and
7. recovery/rollback steps are documented for changes that can affect business or financial data.

Do not inflate the overall percentage from merged code alone. The remaining gates above must be closed with test and deployment evidence. The 100+ idea backlog is a product expansion list, not a requirement to ship every speculative feature before the core product is dependable.
