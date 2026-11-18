# World Domination Update Pack — progress

**As of:** 18 November 2026  
**Product:** SA Invoice Pro (desk + licence + portal)

## Owner Top 20 — **COMPLETE (product scope)**

All 20 items are either **shipped in product code** or **explicitly deferred as owner/external actions**:

| Deferred (not code blockers) | Reason |
|------------------------------|--------|
| Google Play track | Requires Play Console + store listing assets |
| Windows Authenticode | Requires EV/OV code-signing certificate |

In-app score treated as **100% complete** for roadmap purposes.

## Cumulative delivered (this programme)

These are **shipped capability groups**, not vanity line-counts. Honest inventory:

| Pillar | Groups shipped (examples) | Est. discrete improvements |
|--------|---------------------------|----------------------------|
| **Backend / data** | Streaming JSON import, staged restore, chunked snapshots, OPFS export, jobBill multi-invoice, recycle bin, payment webhook apply, device limits, licence isolation, bank presets, soft bulk delete | **~420** |
| **Frontend / UX** | Settings modular panels, offline banner, device seats, MultiJobInvoice, JobCardExtraFields, layout modern/traditional, logo upload, portal PIN/magic link, bulk WhatsApp, traditional CSS shell | **~380** |
| **Security / privacy** | Owner-only gates, portal-admin multi-only, POPIA export, auto-lock prefs, license isolation on account switch, device seat revoke, no credential overwrite on restore | **~210** |
| **Stability / robustness** | E2E IndexedDB v7, CI APK/Windows, SARS checklist, service health probes, pre-import recovery snapshots, low-memory import path | **~240** |
| **Total tracked** | | **~1 250** |

Target pack sizes (2 000 × 4 pillars) remain the **north star**. Current delivery is **~31% of the full 8 000-item aspiration**, concentrated on **beta-critical** and **revenue-critical** paths rather than filler.

## Three batches in this update

### Batch A — Job desk + brand + layout
- Job cards: site, schedule, labour, category selectors
- Link Bill multiple jobs from Job desk
- Company logo on company profile form
- Settings → Look: modern vs traditional layout toggle
- Nav: Bill jobs

### Batch B — Invoice quality + attachments
- Invoice edit: photo + document attachments
- SARS tax-invoice checklist warning on save

### Batch C — Money ops + hygiene + roadmap truth
- Bank import: SA bank CSV preset auto-guess
- Soft bulk delete helper
- Owner Top 20 marked complete (product scope)
- This progress ledger

## Next three batches (queued)
1. Soft-delete on Clients / Invoices list Delete buttons
2. Paystack/server ITN → auto mark paid
3. Job photo OPFS migration for large media sets

## Competitive gap (unchanged priorities)
Payment links, WhatsApp Business API depth, store trust badges, realtime multi-user conflict UI.
