# Release readiness — honest status (28 Nov 2026)

## Short answer

**IT product path on the live web app is pilot-usable. Tip is not yet a clean “ship it” release.**

| Layer | Status |
|-------|--------|
| Live web https://sa-invoice-pro.pages.dev/ | HTTP 200; IT desk usable |
| IT module (jobs, templates, presets) | Product-stable for pilot |
| CI e2e-smoke on tip | **Failing** (was CI guard / version files) |
| APK workflow on tip | **Failing** |
| Windows Tauri on tip | **Failing** |
| v6.75.0 release assets | **0 files** |
| v6.74.0 release assets | APK + Windows present |
| README / CHANGELOG | Restored on tip for version guard |

## To succeed on a real release

1. CI guard + e2e green on `main`
2. APK workflow green and asset on the tag
3. Windows MSI/setup green (or documented portable-only)
4. Cloudflare Pages / Worker deploy green
5. Smoke: register → company IT type → client → job → invoice → backup
6. License server health + portal PIN on a test client
7. No empty critical docs; no PLACEHOLDER source files

## Code hygiene

Many `desk*.js` helpers were batch libraries with synthetic `_pad_*` exports and **no imports** from pages. Pads stripped; modules kept as optional libraries until wired or deleted in a focused cleanup PR.
