# SA Invoice Pro — Post-Beta Roadmap
**World Domination Update Pack (practical edition)**  
Version baseline: **6.68.0 first public beta** · Updated: 2026-11-17

---

## Scoreboard (honest)

| Pillar | Items | Done | Partial | Open |
|--------|------:|-----:|--------:|-----:|
| **A Backend / data / workers** | 15 | 1 | 2 | 12 |
| **B Frontend / UX** | 15 | 1 | 3 | 11 |
| **C Security / privacy** | 15 | 1 | 2 | 12 |
| **D Stability / robustness** | 15 | 5 | 2 | 8 |
| **Total tracked** | **60** | **8** | **9** | **43** |

**Beta readiness (product sense):** ~**70–75%** for pilot workshops (core invoice/quote/ticket/VAT/backup path works).  
**Parity with SA SaaS invoicers (Rebill / Zoho / Illumi):** ~**40–50%**.  
**Parity with full accounting (Xero / Sage):** ~**20–25%** (by design — we are not full books yet).

### Shipped this cycle (do not regress)

| Item | Status |
|------|--------|
| A1 OPFS recovery snapshots | **Done** |
| D1 CI green (e2e + APK + Workers) | **Done** |
| D12 PLACEHOLDER / zero-byte ban | **Done** |
| D14 APK on GitHub Releases | **Done** |
| D15 Windows MSI / setup / portable | **Done** (unsigned) |
| Streaming backup import | **Done** |
| Chunked recovery snapshots | **Done** |
| First public beta + marketing pack | **Done** |
| B2 Onboarding checklist on Home | **Present** (component live) |
| B1 Full Settings tabs | **Partial** |
| PayFast / portal / WhatsApp desk | **Partial** (hooks + UX exist; payment webhooks incomplete) |

---

## Pillar A — Backend, data & workers

1. ~~OPFS-backed recovery snapshots~~ **done**
2. Incremental workspace sync deltas
3. Background sync worker + offline queue metrics
4. Server-side backup receipt (licensed cloud)
5. Idempotent import job IDs
6. Store-level checksums after staged restore
7. Soft-delete + recycle bin (30-day)
8. Multi-company switcher + isolated snapshots
9. Attachment blobs (job photos) in OPFS + LRU
10. License heartbeats + offline grace UX
11. PayFast / Paystack **webhook reconciliation**
12. Portal token rotation + single-use accept links
13. WhatsApp outbound rate limits + quiet hours
14. Audit log CSV export (POPIA)
15. Nightly integrity scan

## Pillar B — Frontend & UX

1. Restore remaining Settings tabs (brand, nav, comms, ops)
2. ~~Guided first-run checklist~~ **component exists — polish + demo data next**
3. Invoice editor virtualisation (50+ lines)
4. Quote → invoice confirmation + terms preview
5. Mobile bottom-nav density (5" Android)
6. Empty states + one-tap **demo data**
7. Command palette (Ctrl/Cmd+K)
8. PDF preview pane before share
9. Bulk invoice actions (mark paid, remind)
10. A11y focus rings / aria on Settings
11. Theme + font presets
12. Offline banner + last-sync + retry
13. Ticket kanban view
14. Statement of account → WhatsApp one-tap
15. Owner Command Centre aged-debt cards (expand)

## Pillar C — Security & privacy

1. Encrypt recovery snapshots at rest (WebCrypto)
2. Finish account vs workspace key matrix
3. Biometric unlock where available
4. CSP on Pages + Worker
5. Strip PII from error reports
6. Device access panel / revoke sessions
7. POPIA export package (JSON + PDF)
8. POPIA delete + retention log
9. Rate-limit cloud login
10. In-app licence threat-model notes
11. No secrets in repo (ongoing)
12. SRI for any CDN scripts
13. Owner recovery passcode
14. localStorage audit
15. Explicit consent before third-party share sheets

## Pillar D — Stability & robustness

1. Keep CI green — **ongoing**
2. Playwright for backup import + recovery restore
3. Chaos: kill tab mid-import
4. Memory budget tests (5 / 15 / 40 MB) on Android Chrome
5. IndexedDB migration tests
6. SW update without blank screen
7. ErrorBoundary + report ID per route
8. Feature flags
9. Perf marks (invoice save, PDF)
10. Rollback runbook on Support
11. Quarterly dependency pin audit
12. ~~ci-guard PLACEHOLDER ban~~ **done**
13. Synthetic monitoring of production
14. ~~APK on Releases~~ **done**
15. ~~Windows MSI channel~~ **done (unsigned)**

## Next batch (recommended order)

1. **B6** Demo data + tighter onboarding completion tracking  
2. **A11** Payment webhook reconciliation (PayFast / Paystack) — *closes a core competitor gap*  
3. **B9** Bulk invoice actions  
4. **B1** Finish Settings tabs  
5. **C1** Encrypt snapshots at rest  
6. **Authenticode** Windows signing when a cert is available  

## Definition of done

1. On `main` · 2. Tests where high risk · 3. CI green · 4. Deploy confirmed · 5. No data-loss path

See also: [Competitive gap analysis](COMPETITIVE_GAP.md)
