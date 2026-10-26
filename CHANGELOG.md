# Changelog

## 6.20.0 — Shell brand & branch limits (2026-10-27)

### White-label (P8)
- Boot-time `applyWhiteLabel` in `main.jsx`.
- Logo data-URL pilot (`fileToLogoDataUrl`, max ~128px).
- Shell sidebar/mobile bar use `displayAppName` when company name empty.
- `ActiveSeatChip` in desktop header.

### Team / branches (P5)
- Nav: Team, Branches, Bank import in sidebar + bottom settings/tools sections.
- `assertCanAddBranch` enforces tier branch caps.

### Platform
- Version 6.20.0 aligned across package/config/version/README/changelog.

## 6.19.0 — Seats & white-label pilot (2026-10-27)

### Team / seats (P5)
- Unified roles, PIN lock, tier seat limits, ActiveSeatChip.

### White-label (P8 pilot)
- Settings brand/accent/tagline/hide powered-by.

## 6.18.0 — Portal quote decisions (2026-10-26)

### Client portal (P4)
- Public portal Accept/Decline quotes.

### Bank match (P3)
- Reason chips via `explainMatchScore`.
