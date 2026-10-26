# Changelog

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

## 6.15.0 — Collections & cash visibility (2026-10-26)

### Collections
- Promise-to-pay tracking and next-chase dates on invoices.
- Collection call log associated with invoices/clients.
- Batch follow-up for promises due.

### Clients & reporting
- Client tags and tag-based filtering.
- 30/60/90-day cash forecast and overdue collection pressure.
- Quote win-rate insight in reporting.

### Reliability
- Corrected overdue reminder helper imports and retained compatibility re-exports.
- Workspace backup metadata is aligned to the app version.

## 4.3.0 — Pinky & the Brain Lab (2026-10-14)

### Theme
- Full **Lab** dark theme (`styles.brain.css`): magenta + cyan accents, gradient stats/headers
- Default dark mode applies lab look; Light/Lab toggle in sidebar
- Glass logo gradient (magenta → purple → cyan)

### UI
- Shell: lab ribbon (`Lab v4.3.0`), sync-ready status line
- Login splash: Lab Edition tagline, **Enter the lab** CTA
- Quick-actions FAB inherits lab glow

### Sync / jobs (from earlier 4.x)
- Job card status pushes to cloud / WhatsApp autoresponder
- Soft-fail WA client import (local-first)

### Codename
`Pinky & the Brain · World Domination Mega Pack`
