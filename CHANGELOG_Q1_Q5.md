# Q1–Q5 — Pro Studio working updates (not empty)

## Q1 — Identity & version
- `APP_VERSION` / `package.json` / `version.json` locked to **5.2.1**
- Codename: Pro Studio · Pinky & the Brain · Q1–Q5
- Sync base still `https://saip-sync.onrender.com`

## Q2 — Documents (expanded registry)
- 18 document types with categories, icons, fields, and **actions**
- Helpers: `listDocumentActions`, `searchDocumentTypes`, `CATEGORY_LABELS`
- Types added: proforma, credit note, PO, timesheet, warranty, terms, etc.

## Q3 — Forms metadata
- Client fields: city, postal, category
- Invoice: discount %
- New `JOB_CARD_FIELDS` + `PRODUCT_FIELDS`
- `fieldByKey` / `requiredKeys` helpers
- Validators + status labels (prior commit)

## Q4 — User control / bulk logic
- `bulkOps.js`: bulk status, bulk delete, selection helpers
- Invoices already: multi-select, mark paid, remind WA/email, flag overdue, CSV, duplicate
- `buttonActions.js`: safeClick, withBusy, debounce

## Q5 — Look & feel + more actions
- `ActionDock` component for sticky control rows
- `styles.q5.css`: action dock, bulk bar, FAB glow, overdue rows
- **Command centre** QuickActions: Create · Collect · Workspace groups
- Dashboard keeps share snapshot + client reminder WA/email

## Already in product (wired control)
- Shell: Ctrl+K search, Ctrl+N invoice, theme, density, help
- Invoice list: filters, sort, bulk bar, aging column
- Admin Lab: wake server, fill password, secrets tab
