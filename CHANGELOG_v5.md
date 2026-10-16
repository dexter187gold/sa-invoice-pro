# SA Invoice Pro v5.0 — Professional Lab

Unified with **saip-sync v5.0.0**. Web (WBA) and APK share the same version channel and remote config.

## Live updates model
1. Admin saves Google Client ID / flags / announcement on saip-sync
2. Apps call `GET /api/config/app` on launch (`src/lib/remoteConfig.js`)
3. No loner local-only settings drift between browser and phone

## Document suite
Registry in `documentTypes.js`: invoice, quote, statement, payslip, job card, SLA, NDA, POPIA, engagement, tax cover, receipt, delivery note.

## Forms
`formFields.js` — professional labels + help text for client and invoice fields.

## Exports
`exportFile.js` — Downloads folder via Capacitor + CSV export path for Reports/Accounting.

## Rollout
1. Deploy saip-sync 5.0.0 + wire config API (see saip-sync CHANGELOG_v5)
2. Deploy this web build / rebuild APK 5.0.0
3. Set secrets in Admin Lab
4. Confirm `/api/config/app` returns your announcement
