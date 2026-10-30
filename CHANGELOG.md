# Changelog

## 6.37.2 — Profile restore hardened (2026-10-30)

### Critical
- Restored **IndexedDB schema v5** including `pettyCash` (regression from interim rewrite fixed)
- Login uses **default `AppLogo` import** (export-check green)
- Backup import: atomic replace → wipe-merge fallback; deep unwrap of nested JSON

### Auth / recovery
- Register password policy aligned with cloud (letters + numbers)
- Local register fallback when cloud was reset
- Settings device import falls back safely if atomic path fails

## 6.37.1 — Beta restore & register fix (2026-10-30)

## 6.37.0 — Command Centre and WhatsApp quick replies (2026-10-29)
