## 6.69.0 — Expanded WhatsApp inbound reply packs

- Added keyword packs for business hours, location/address, network unlock/SIM, laptop/PC/slow/storage, tablet/iPad.
- Inbox smart-suggest now covers more common SA desk queries with ZA-tone EN + AF options.

## 6.68.0 — Desktop packages + OPFS recovery

- APK workflow attaches `SA-Invoice-Pro-Lab-v*.apk` to the matching GitHub Release tag.
- Windows Tauri scaffold (`src-tauri`) + CI for MSI/NSIS (fallback portable zip).
- Recovery snapshots larger than ~1.5 MB offload payload to OPFS (roadmap A1).
- Company save validation fixed (array errors); e2e green on prior tip.

## 6.67.0 — Beta readiness

- Streaming company backup import for large files (File.stream + staged restore).
- Chunked recovery snapshots (store-by-store, no exportAll memory spike).
- Settings: Company profile, VAT on/off + rate, Backup tab, Cloud, Security, Look.
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
