# Changelog

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
