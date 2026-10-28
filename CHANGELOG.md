# Changelog

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
