# Roadmap progress — 6.15.0

## Overall **~78%** (was ~76%)

| Phase | Before | After |
|-------|-------:|------:|
| P1 Foundation | 94% | 94% |
| P2 Desk / jobs | 74% | 75% |
| P3 Money | 78% | **84%** |
| P4 Client portal | 82% | 82% |
| P5 Team / branch | 68% | 68% |
| P6 Comms | 52% | 54% |
| P7 Intelligence | 32% | **38%** |
| P8 License | 58% | 58% |
| P9 Platform | 55% | 56% |
| P10 Moat / compliance | 58% | 58% |

### This slice (6.15.0)
- **Build fix:** `buildOverdueReminder` / `toWaNumber` imported from `share.js` (were wrongly imported from `sla.js` → Cloudflare prebuild fail)
- Re-export WA helpers from `sla.js` for backward safety
- Promise-to-pay + nextChaseDate on invoices (PTP button)
- Collection call log (settings store, per invoice/client)
- Chase promises due batch
- Client tags module (`clientTags.js`)
- Cash forecast 30/60/90 (`forecast.js`)
- Quote win-rate insight (`quoteWinRate`)
