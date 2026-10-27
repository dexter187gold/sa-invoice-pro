# Roadmap progress — 6.25.0

## Overall **~98%** product-desk completeness (code)

| Phase | % | Notes |
|-------|--:|-------|
| **P1 Foundation** | **96%** | Auth, sync, git-data durability |
| **P2 Desk / jobs** | **90%** | Collection ring + past-promise pulse |
| **P3 Money** | **92%** | Chase, bank match |
| **P4 Client portal** | **98%** | **Live aliases verified on saip-sync** |
| **P5 Team / branch** | **90%** | Seats + inter-branch stock |
| **P6 Comms** | **80%** | WA templates text; Cloud API later |
| **P7 Intelligence** | **64%** | Desk “do next” ranking |
| **P8 License** | **84%** | Soft alpha on free tier OK |
| **P9 Platform** | **90%** | Auth e2e + dual portal paths |
| **P10 Moat** | **82%** | Pulse convert queue |

### Free-tier alpha (owner plan)
- Stay on Render free + git `saip-sync-data` for ~3 months alpha/beta.
- Device licensing / paid plans after beta — no need for persistent disk until then.

### Live checks (2026-10-27)
- `GET /api/portal/view/:token` → JSON errors (deployed)
- `POST /api/portal/quote-decision` → validation JSON (deployed)
- Git data push enabled on health

### Remaining
- Meta WhatsApp Cloud API (owner has WABA — integrate when ready)
- Per-device license enforcement for paid tier
- Optional paid Render when free hours are tight
