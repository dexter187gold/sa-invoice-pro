# Changelog

## 6.19.0 — Seats & white-label pilot (2026-10-27)

### Team / seats (P5)
- Unified role list (owner → viewer) with descriptions shared by Team + RoleGate.
- Seat **PIN lock** on switch; tier **seat limits** enforced on add (`assertCanAddSeat`).
- Shop tier maps to 5 seats; Multi to 25.
- `ActiveSeatChip` + `sa-active-seat` event for live UI.

### White-label (P8 pilot)
- Settings → **White-label**: brand name, accent hex, portal tagline, hide powered-by.
- `src/lib/whiteLabel.js` applies `--green` / `--brand-accent` without wiping theme pack.

### Platform
- Unit tests for seats limits + white-label softAccent.
- Playwright: team route smoke.

## 6.18.0 — Portal quote decisions (2026-10-26)

### Client portal (P4)
- Public `/portal` and `/portal/:token` routes (no shop login required).
- Clients can **Accept** or **Decline** open quotes with an optional note.
- Portal summary strip: open balance + quote counts.
- Helpers in `src/lib/portalQuote.js` (token extract, decision payload, summary).

### Bank match (P3)
- Match results now carry **reason chips** (exact amount, invoice number, name tokens, phone).
- `explainMatchScore` exported for tests and UI tooltips.

### Platform (P9)
- Playwright: portal route smoke + bank page route smoke.
- Unit tests for portal quote decision helpers.

## 6.17.0 — Bench moat (2026-10-26)

### Job desk (P2)
- Device passport fields (brand, model, IMEI, serial) on job create/edit.
- FRP / iCloud / MDM QC checklist helpers.
- Job hologram WhatsApp status card share.

### SA uniqueness (P10)
- Load-shedding mode: queue outbound WA/SMS when offline or flagged.
- Collection ring on Pulse Home for devices ready for pickup.

### Comms (P6)
- Quiet hours + phone opt-out prefs for outbound messages.

### Intelligence (P7)
- Desk rules: promise-to-pay due, collection-ready jobs, ≥7d overdue.

### Ops
- Product contact email `sainvoicepro@gmail.com` in config.
- `INSTRUCTIONS.md` for Grok workspace handoff.
