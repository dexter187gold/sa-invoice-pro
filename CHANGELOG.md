# Changelog

## 6.35.0 — Payroll, books and document studio (2026-10-28)

### Payroll and South African payslips
- Three PDF layouts: template match, simplified and detailed.
- Expanded employee/employer snapshots, earnings, deductions, employer contributions, leave and year-to-date details.
- Payroll preflight checks, local-date handling and taxable-remuneration preview.
- SARS/PAYE values remain estimates; verify complex tax treatment before production payroll.

### Bookkeeping and documents
- Import bank statements from CSV, Excel and selectable-text PDF; review and classify transactions, detect duplicates and link eligible payments/expenses.
- IT Document Studio with 69 structured templates, linked business records and generation history metadata.

### Reliability and release
- Force-refresh the PWA cache namespace so clients fetch the current app bundle.
- Fix route visibility recovery and repair StatCard class rendering; Playwright smoke and Cloudflare deployment workflows pass for this revision.


## 6.34.0 — P1 CRUD mega · roadmap (2026-10-28)

### Desk CRUD
- **Products / Services:** Edit · Update · Duplicate · Delete · Actions menu
- **Expenses:** Edit · Update · Duplicate · Delete · Actions menu
- Preserve stock / branch fields on product update

### Roadmap
- Owner **P1–P10** scoreboard + 100+ feature backlog in `ROADMAP_STATUS.md`

## 6.33.0 — Employees CRUD · release polish (2026-10-28)

### Employees
- **Edit** existing staff (update via IndexedDB `put`)
- **Actions** menu: Edit · Duplicate · Archive/Restore · Delete
- Dedicated **Edit** button on each card
- Active / Archived / All filter
- Safer delete with error toasts and id checks

### Stability
- Confirm dialogs **await** async confirm handlers (delete/save no longer race)
- Vite `base: '/'` so deep portal routes load assets (smoke green)

## 6.32.0 — Clean chrome · FAB stack (2026-10-27)

### Layout
- **Quick Actions** and **AI** FABs stacked on the right, above bottom nav (safe-area aware)
- Quick-actions panel opens upward; no longer covers bottom nav targets
- Extra main padding so lists aren’t hidden behind the stack

### Deduped chrome
- Removed **Help** + **Notification** from the breadcrumb/header strip (duplicates of the top bar)
- Desktop header keeps Sync + seat chip only

## 6.31.0 — Self-serve PayFast · account seats (2026-10-27)

## 6.30.0 — Active soft licensing (2026-10-27)
