# Changelog

## 6.37.1 — Beta restore & register fix (2026-10-30)

### Auth after cloud reset
- Register accepts cloud password rule: **letters + numbers**, min 6
- If cloud is down or was reset, **local account** is created so beta is not blocked
- Clearer login errors when no local profile exists

### Backup import
- Deeper unwrap of nested / alternate JSON shapes
- Login import tries atomic replace, falls back to wipe-merge
- Settings import falls back to `importAll` if atomic replace fails
- Soft company placeholder when profile-only backups omit company array

## 6.37.0 — Command Centre and WhatsApp quick replies (2026-10-29)

### Navigation and release reliability
- Merge the mobile menu and Command Centre access into a single toggle.
- The Command Centre button opens and closes the panel; remove the redundant in-panel Close button.
- Include all menu sections in the Command Centre panel.
