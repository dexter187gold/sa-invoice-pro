## 6.74.0 — Complete inbound WhatsApp desk reply packs

- Consolidated and expanded suggestInboundReplies with full keyword packs: greeting, status, ready/collection, parts delay, quote/price/negotiation/approve, payment/invoice/plan, hours/location/delivery/call-out, screen/battery/laptop/tablet/network, water damage, FRP/wipe, photos, rush/same-day, trade-in, insurance, after-hours/load shedding/holiday, review/thanks/opt-out, turnaround/backup/IMEI/tech.
- All in friendly ZA English + short Afrikaans options. Inbox paste-and-suggest now covers real desk conversations end-to-end.
- Version aligned across package.json, config.js, version.json, README, CHANGELOG.

## 6.73.0 — Full inbound WhatsApp desk reply packs

- Implemented complete keyword-aware suggestInboundReplies covering greetings, status, ready/collection, parts waiting, quote/price, payment/invoice, hours/location, screen/battery, water damage, FRP/Google lock, and after-hours/load shedding.
- All replies in friendly ZA English with short Afrikaans options; ready for Inbox paste-and-suggest.
- Version aligned across package.json, config.js, version.json, README, CHANGELOG.

## 6.72.0 — Deeper WhatsApp inbound reply packs

- Added keyword packs for delivery/collect, home visit/call-out, price negotiation, turnaround time, backup-first, stolen/IMEI, public holiday, technician query, payment plan, and account statement.
- Inbox smart-suggest now covers even more real SA desk conversations with ZA-tone EN + AF options.
- Version alignment fixed across package.json, config.js, version.json, README, CHANGELOG.

## 6.71.0 — Expanded WhatsApp inbound reply packs (ops depth)

- Added keyword packs for parts delay, quote approval, photo of damage, rush/same-day, trade-in, factory reset/wipe, insurance claim, after-hours, thanks/review request, opt-out/STOP, and collection time change.
- Inbox smart-suggest now covers more real desk conversations with ZA-tone EN + AF options.

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
