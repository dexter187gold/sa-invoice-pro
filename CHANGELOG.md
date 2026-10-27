# Changelog

## 6.30.0 — Active soft licensing (2026-10-27)

### License
- **30-day alpha soft trial** (`ALPHA_TRIAL_DAYS`); `ensureTrialStarted()` on status read
- `pingLicenseServer()` helper · default product email on request
- Soft mode still never hard-blocks the desk

### Ops
- `docs/APP_LINKS.md` — license, admin, updates, sync, portal
- `APP_LINKS` + `updatesServerUrl` on `SA_CONFIG`
- Render API redeploy: sa-invoice-license, sa-invoice-updates, saip-sync

## 6.29.0 — Portal payments · shared convert (2026-10-27)

### Quotes
- Shared `convertQuoteToInvoice` + navigate to invoice

### Client portal
- **Payments** history page (5th section)

### Tests
- Playwright quotes + payments smoke

## 6.28.0 — Mega bank + portal e2e (2026-10-27)

## 6.27.0 — Mega desk (2026-10-27)
