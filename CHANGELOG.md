## 6.67.0 — Beta readiness

- Streaming company backup import for large files (File.stream + staged restore).
- Chunked recovery snapshots (store-by-store, no exportAll memory spike).
- Settings: Company profile, VAT on/off + rate, Backup tab, Cloud, Security.
- Restored exportFile helpers; CI guard blocks PLACEHOLDER and empty src files.
- e2e seed aligned to IndexedDB v7.

## 6.66.2 — Chunked recovery snapshots

- localAutoBackup builds snapshots store-by-store.
- Recovery restore requires confirmed:true from Settings.

## 6.66.1 — Streaming backup import + e2e DB v7

- streamBackupImport scanner; importBackupFromFile entry.
- e2e helpers open IndexedDB v7 with importStaging / autoBackups / accountWorkspaces.

## 6.66.0 — Expanded WhatsApp desk replies

- Keyword packs for motherboard, data transfer, drop-off, accessories, load shedding, price negotiation.
- Smart suggest on Inbox covers more SA repair desk conversations.

## 6.65.0 — CI green, license UX, coffee FAB

- Sticky licence contact bar; full plan cards; checkout toasts.
- Floating Buy us a coffee FAB.
- Hardened GitHub Actions and version/export guards.
