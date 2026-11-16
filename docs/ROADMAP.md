# SA Invoice Pro — Post-Beta Roadmap
**World Domination Update Pack (practical edition)**  
Version baseline: **6.68.0** · Updated: 2026-11-17

---

## Progress this cycle

| Item | Status |
|------|--------|
| A1 OPFS-backed recovery snapshots | **Shipped** (payload offload > ~1.5 MB) |
| D1 CI green (e2e + APK + Workers) | **Shipped** on 6.67.x tip |
| D14 APK on GitHub Releases | **Shipped** (workflow attaches to `v{version}`) |
| Windows desktop MSI/NSIS | **In progress** (Tauri scaffold + CI) |
| B1 Full Settings remaining tabs | Partial (core tabs live) |

---

## Pillar A — Backend, data & workers

1. ~~OPFS-backed recovery snapshots for workspaces > 20 MB~~ **done (threshold ~1.5 MB JSON)**
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
2. Clear separation of account/licence keys vs workspace data.
3. Biometric unlock where available (on top of auto-lock).
4. CSP headers on Pages + Worker.
5. Strip PII from client-side error reports.
6. Device access panel: revoke other sessions.
7. POPIA export package (JSON + human PDF).
8. POPIA delete-with-retention-log.
9. Rate-limit login attempts on cloud auth.
10. Document hardware licence threat model in-app.
11. No secrets in repo.
12. Subresource integrity for any CDN scripts.
13. Secure passcode for owner recovery flows.
14. Audit of localStorage keys.
15. Third-party share sheet only after explicit consent.

## Pillar D — Stability & robustness

1. ~~Keep CI green~~ **ongoing**
2. Playwright coverage for backup import progress + recovery restore.
3. Chaos test: kill tab mid-import → workspace unchanged.
4. Memory budget tests for 5 / 15 / 40 MB backups on Android Chrome.
5. IndexedDB version migration tests.
6. Service worker update prompt without blank screen.
7. ErrorBoundary per route with report ID.
8. Feature flags for experimental modules.
9. Performance marks on invoice save and PDF generate.
10. Rollback runbook on Support page.
11. Dependency pin audit quarterly.
12. ~~Zero-byte / PLACEHOLDER ban in ci-guard~~ **done**
13. Synthetic monitoring of production health.
14. ~~APK on GitHub Releases~~ **done**
15. Windows MSI/NSIS channel (Tauri) — **CI scaffolded**

## Shipped foundation (do not regress)

- IndexedDB v7 + importStaging + staged atomic restore
- Streaming JSON import + OPFS export download
- Chunked + OPFS recovery snapshots
- VAT preference UI
- Licence gates + portal + WhatsApp desk packs
- e2e DB v7 seed; company save array-validation fix

## Definition of done

1. On `main`  2. Tests where high risk  3. CI green  4. Deploy confirmed  5. No data-loss path
