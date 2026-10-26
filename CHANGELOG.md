# Changelog

## 6.21.0 — PDF brand & portal offline (2026-10-27)

### White-label / PDF (P8)
- `src/lib/pdfBrand.js` — logo + accent for jsPDF.
- Tax invoice + professional templates draw brand logo and accent green.
- Footer respects hide-powered-by.

### Client portal (P4)
- Quote decisions **queue offline** when sync server is unreachable.
- Local decision payload still returned for optimistic UI.

### Platform (P9)
- Unit tests for pdfBrand + portal helpers.
- Playwright: branches, settings, bank route smoke.

## 6.20.0 — Shell brand & branch limits (2026-10-27)

### White-label (P8)
- Boot-time apply, logo data-URL, Shell brand, ActiveSeatChip.

### Team / branches (P5)
- Branch tier limits, nav Team/Branches/Bank.

## 6.19.0 — Seats & white-label pilot (2026-10-27)

### Team / seats (P5)
- PIN lock, tier seat limits, expanded roles.
