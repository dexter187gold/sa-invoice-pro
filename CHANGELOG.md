# Changelog

## 6.28.0 — Mega bank + portal e2e (2026-10-27)

### Bank CSV match v2
- Date proximity scoring (within 3 days / 2 weeks of invoice or due)
- Broader SA bank headers (Capitec, Discovery, beneficiary ref)
- SA decimal formats (`1.250,50`) + stronger amount parsing
- Invoice number fragment matching

### Tests
- Unit: date proximity + SA amount formats
- Playwright: `e2e/portal.spec.js` multi-page sections
- Playwright: `e2e/bank.spec.js` import page smoke

### Status
- Desk / portal / license alpha path tightened toward production-ready free tier

## 6.27.0 — Mega desk (2026-10-27)

### Owner desk
- **One-tap Convert** on Home for accepted portal quotes → tax invoice
- Soft **alpha device license** banner (never hard-blocks free-tier alpha)
- Deeper **ticket SLA** (promised date + priority clocks)

### Lib
- `quoteConvert.js`, `deviceLicense.js`, `ticketSla.js` + unit tests

### Sync (saip-sync)
- WA Cloud API scaffold routes (env-gated)

## 6.26.0 — Multi-page client portal

## 6.25.0 — Desk pulse & portal convert
