# SA Invoice Pro — Post-Beta Roadmap
**World Domination Update Pack (practical edition)**  
Version baseline: **6.67.0 beta** · Updated: 2026-11-17

This roadmap builds on everything shipped from first IndexedDB workspace through streaming backup, staged restore, OPFS export, VAT consistency, and beta hardening.

---

## Pillar A — Backend, data & workers (priority order)

1. OPFS-backed recovery snapshots for workspaces > 20 MB (metadata in IDB, payload on disk).
2. Incremental workspace sync deltas (only dirty stores to Render workers).
3. Background sync worker with exponential backoff + offline queue metrics.
4. Server-side backup receipt (hash + timestamp) for licensed cloud plans.
5. Idempotent import job IDs to prevent double-apply on flaky networks.
6. Store-level checksums after staged restore (detect silent corruption).
7. Soft-delete + recycle bin for invoices/clients (30-day retention).
8. Multi-company switcher with isolated recovery snapshots per company.
9. Attachment blobs (job photos) in OPFS with LRU eviction.
10. License heartbeats with offline grace and clear UX when grace ends.
11. PayFast / Paystack webhook reconciliation job.
12. Portal token rotation and single-use accept links.
13. WhatsApp outbound rate limits + quiet-hours enforcement on worker.
14. Audit log export (CSV) for POPIA requests.
15. Automated nightly integrity scan (orphans, negative stock, VAT drift).

## Pillar B — Frontend & UX

1. Restore remaining Settings tabs (brand, nav, comms, operations defaults).
2. Guided first-run checklist (company → VAT → first client → first invoice).
3. Invoice editor performance for 50+ line items (virtualised rows).
4. Quote → invoice conversion confirmation with payment terms preview.
5. Mobile bottom-nav density pass for Android 5" screens.
6. Empty states with one-tap demo data (opt-in, removable).
7. Global command palette (Ctrl/Cmd+K) for clients, invoices, tickets.
8. PDF preview pane before share (jsPDF canvas).
9. Bulk actions on invoice list (mark paid, send reminder).
10. Accessible focus rings and aria on all Settings tabs.
11. Theme + font pairing presets saved per device.
12. Offline banner with last-sync time and retry.
13. Ticket board kanban optional view.
14. Statement of account one-tap WhatsApp share.
15. Owner Command Centre cards for aged debt and open jobs.

## Pillar C — Security & privacy

1. Encrypt recovery snapshots at rest (device key in WebCrypto).
2. Clear separation of account/licence keys vs workspace data (already partial — finish matrix).
3. Session timeout + auto-lock already present — add biometric unlock where available.
4. CSP headers on Pages + Worker.
5. Strip PII from client-side error reports.
6. Device access panel: revoke other sessions.
7. POPIA export package (JSON + human PDF).
8. POPIA delete-with-retention-log.
9. Rate-limit login attempts on cloud auth.
10. Hardware-bound licence proofs (existing) — document threat model in-app.
11. No secrets in repo; rotate any historical placeholders.
12. Subresource integrity for CDN scripts if any remain.
13. Secure passcode for owner recovery flows.
14. Audit of localStorage keys (no tokens in plain form beyond session).
15. Third-party share sheet only after explicit consent.

## Pillar D — Stability & robustness

1. Keep CI green: unit, e2e-smoke, APK, Workers, Pages.
2. Playwright coverage for backup import progress + recovery restore.
3. Chaos test: kill tab mid-import → workspace unchanged.
4. Memory budget tests for 5 MB / 15 MB / 40 MB backups on Android Chrome.
5. IndexedDB version migration tests (v6 → v7 → future v8).
6. Service worker update prompt without blank screen (already unlocked in e2e).
7. ErrorBoundary per route with report ID.
8. Feature flags for experimental modules.
9. Performance marks on invoice save and PDF generate.
10. Rollback runbook documented in Support page.
11. Dependency pin audit quarterly.
12. Zero-byte / PLACEHOLDER file ban in ci-guard (done — keep expanding).
13. Synthetic monitoring of production `/` and `/api` health.
14. APK versionCode auto-bump aligned with package.json.
15. Beta channel vs stable channel on Pages (optional).

---

## Shipped foundation (do not regress)

- IndexedDB v7 + importStaging + staged atomic restore
- Streaming JSON import (`streamBackupImport` + `importBackupFromFile`)
- OPFS / File System Access backup download
- Chunked recovery snapshots
- VAT preference normalisation + Settings UI
- Licence access gates + portal
- WhatsApp desk replies + chase packs
- e2e helpers DB v7 seed

## Definition of done for each roadmap item

1. Implementation on `main`
2. Unit or e2e coverage where risk is high
3. CI green
4. Production deploy confirmed
5. No customer data loss path introduced
