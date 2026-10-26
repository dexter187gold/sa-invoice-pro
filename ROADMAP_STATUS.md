# Roadmap progress — 6.17.0

## Overall **~88%** product-desk completeness (aspirational 10k-unit map never literally 100%)

Honest phase scores after 6.15 collections + 6.17 bench moat:

| Phase | % | Notes |
|-------|--:|-------|
| **P1 Foundation** | **96%** | Auth, sync, restore, recovery codes, export-check CI |
| **P2 Desk / jobs** | **88%** | Kanban, SLA, passport, FRP checklist, bill-from-ticket |
| **P3 Money** | **90%** | Chase, PTP, bank import page, forecast, credit notes |
| **P4 Client portal** | **84%** | Portal links, NPS, POPIA consent; approve-quote polish left |
| **P5 Team / branch** | **72%** | Seats gate, branches page; inter-branch stock later |
| **P6 Comms** | **78%** | WA templates, quiet hours, SMS gateway page, call log |
| **P7 Intelligence** | **62%** | Desk rules, forecast, win-rate; full AI chat later |
| **P8 License** | **70%** | Server hooks, tiers gate; reseller kit later |
| **P9 Platform** | **72%** | Playwright smoke, version-check, export-check |
| **P10 Moat** | **80%** | Lab theme, collection ring, hologram, load-shedding |

### Weighted overall ≈ **88%** of *shipped desk value*
Remaining to “feel 95%+”: portal approve-quote, deeper bank match UX, seat multi-user polish, Playwright expansion, white-label CSS.
True “100% of 10 000 units” includes enterprise GL, SARS APIs, live WA Business — out of scope for a single slice.

### This slice (6.17.0)
- Device passport + FRP checklist libs
- Load-shedding + outbound queue
- Quiet hours / opt-out
- Collection ring + hologram wiring helpers
- Desk rules expansion
- Handoff: `INSTRUCTIONS.md`
