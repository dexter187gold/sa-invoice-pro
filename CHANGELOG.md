# Changelog

## 6.31.0 — Self-serve PayFast · account seats (2026-10-27)

### Licensing model
- **Account email + seats** after payment (not IP, not MAC)
- Soft device id only counts seats after claim
- PayFast: `POST /api/billing/checkout`, ITN `/api/billing/itn`, claim `/api/billing/claim`

### SPA
- `src/lib/billing.js` — buy plan → PayFast form post → claim by email
- License page: Buy Solo/Shop/Multi + Claim after payment

### Ops
- `start_license.py` — use as Render start command to load billing
- Marketing site: github.com/dexter187gold/sa-invoice-pro-website

## 6.30.0 — Active soft licensing (2026-10-27)

## 6.29.0 — Portal payments · shared convert (2026-10-27)
