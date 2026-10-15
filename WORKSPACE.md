# Workspace & persistence

## Why the cloud workspace "keeps clearing"
The agent sandbox (`/tmp`) is ephemeral. Code that is only written there is lost between sessions.

**Source of truth:** GitHub `dexter187gold/sa-invoice-pro` (and `saip-sync` for the server).
Always push after changes. Pull before continuing work.

## App data on your phone (APK)
- Business data lives in **IndexedDB** on the device (offline-first).
- It does **not** clear when the GitHub workspace resets.
- Use **Settings → Export backup JSON** regularly, and **Import backup** on Login if you reinstall.
- Solo offline mode keeps cloud sync off so your lab stays local-only.

## PDF on Android
- Preview uses an in-app overlay (no `window.open`).
- **Share** opens the system sheet so you can Save to Files / Drive / WhatsApp.
- Statements, invoices, quotes, payslips, and Documents all go through `src/lib/pdfOpen.js`.
