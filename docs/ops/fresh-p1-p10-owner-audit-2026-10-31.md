# SA Invoice Pro — Fresh P1–P10 Owner Audit
**Audit date:** 2026-10-31  
**Audited branch:** main  
**Audited app version:** 6.46.0  
**Audit posture:** evidence-led; code presence is not production acceptance.

## Executive owner assessment

The previous headline “93% weighted readiness” in `ROADMAP_STATUS.md` is not supportable as a release-confidence figure. It mixes feature completion with operational readiness and assigns P10 only 35%. This audit replaces that headline for decision-making until a full weighted feature inventory is rebuilt.

**Release confidence: BLOCKED pending payment, bank, restore and permission acceptance tests.** The last attempted legacy-Worker shutdown also caused a real CI regression: 81 unit tests passed and one failed because the worker returned 410 where the SPA asset fallback was expected. The next commit restores the old Worker browser entry point for the validation window; its E2E workflow is running at audit time.

## P1–P10 findings

| Phase | Owner view | Evidence / gaps | Priority |
|---|---|---|---|
| P1 Foundation & release integrity | AMBER | Version 6.46.0; Worker deployment and release workflow passed on the rollback commit. Latest E2E is pending. A failed shutdown experiment exposed a test gap; old Worker access is restored pending acceptance. | P0 |
| P2 Desk / jobs | AMBER | Core tickets, SLA and workflow tests exist. Full technician lifecycle, attachments, offline conflict and real-device regression are not proven by the current smoke suite. | P2 |
| P3 Money / quote-to-cash | AMBER–RED | Payment helper tests cover partial, exact-balance, overpayment and invalid amounts. Missing end-to-end duplicate-submit/idempotency, concurrent payment, payment deletion/reversal, credit-note and journal reconciliation acceptance. | P0 |
| P4 Client portal | AMBER | Portal safeguards and backend hardening exist, but real fresh-browser customer-link isolation, expiry/revocation and customer-visible data checks remain acceptance gates. | P1 |
| P5 Team / branches / permissions | AMBER–RED | Client-side plan route gates and one technician-settings test exist. Need server-side owner/member/branch authorization tests for every sensitive endpoint and resource, invite lifecycle and cross-tenant negative tests. | P0 |
| P6 Communications | AMBER | WhatsApp helper and owner chase queue exist. Delivery, retries, opt-out, quiet hours and provider webhook behaviour need live/sandbox acceptance. | P2 |
| P7 Intelligence / owner insights | AMBER | Owner Command Centre has rule-based prompts and read-only financial integrity scan. Metrics are local-record-derived and explicitly not a complete audit; add explainability, data freshness, stale-sync warnings and anomaly drill-down. | P2 |
| P8 Licensing / payments | AMBER–RED | PayFast/license paths exist. Paystack/Capitec Pay settlement and webhook verification are not complete; renewal, duplicate callback, invalid signature and entitlement timing need tests. | P0 |
| P9 Platform / sync / recovery | AMBER–RED | IndexedDB rolling auto-backup (5 snapshots), pre-restore rollback and atomic replace helper exist. There is no demonstrated restore round-trip test in the inspected test set; cloud merge/conflict and backup portability need disposable-workspace tests. | P0 |
| P10 Compliance / differentiation / scale | AMBER | POPIA-minded controls, audit events and SA-specific features exist. No evidence here of completed retention/export/delete lifecycle review, penetration test, load test or independent compliance assessment. | P2 |

## Evidence sampled

- Unit workflow on commit `00637583bacdb9e3b96732b7a96a5b9f8a2291ac`: 81 passed, 1 failed. Failure: `tests/worker.test.js` expected non-API SPA paths to continue returning static assets; the experimental 410 response broke that contract.
- Follow-up commit `6f7922c937d6cd7a030a6c26120a26233929ed6b` restores `env.ASSETS.fetch(request)` for non-API routes. Worker deploy and release succeeded; E2E and signed APK were still running at audit time.
- Bank import has a compare-before-write UI and explicit “Apply decisions to books”; statement import itself is described as not changing invoice status. Matching and import helpers have unit coverage, but the browser test currently checks route/paste controls rather than a full import→review→commit→payment flow.
- Financial integrity scan is read-only; historical paid-status repair is offered only when linked payment rows equal invoice total within one cent and requires confirmation/audit entries.
- Auto-backup retains up to five local snapshots. Restore first creates a rollback snapshot, then calls `replaceAllAtomic`; no restore integration test was found in the sampled suite.
- Access control currently includes client-side plan/path checks. These are not a substitute for server-side authorization.

## Mandatory test sequence

1. **Payment safety:** create a disposable invoice; exact, partial, overpayment, duplicate click, retry after timeout, concurrent submit, deletion/reversal, journal idempotency and refresh consistency. Verify no invoice can become Paid without evidence.
2. **Bank reconciliation:** import a known statement twice; compare duplicate decisions; debit cannot match invoice; credit match suggestion cannot post automatically; apply one confirmed match; re-apply same line; verify exactly one payment/journal row; validate opening + credits − debits = closing; test ambiguous and mismatched amounts.
3. **Backup/restore:** export snapshot; mutate disposable workspace; restore; compare every store/count and key records; simulate failed restore and prove rollback; verify JSON export/import on a second browser profile/device; verify restore cannot cross account/workspace boundaries.
4. **Permissions:** owner, manager, technician and client/member identities; direct URL and API calls; cross-workspace object IDs; revoked/expired invites; branch isolation; owner recovery; confirm forbidden writes return 401/403 server-side.
5. **Production acceptance:** repeat only with synthetic/test data and a sandbox payment account. Do not use real customer records or live payment settlement as test fixtures.

## Release gates

- [ ] Current main CI unit tests, build and E2E all green.
- [ ] Legacy Worker browser route remains available during this validation window.
- [ ] Payment safety suite passes, including duplicate and retry idempotency.
- [ ] Bank reconciliation round-trip passes with duplicate statement import.
- [ ] Restore round-trip and rollback-failure tests pass.
- [ ] Server-side permission and cross-tenant negative tests pass.
- [ ] Fresh-browser portal and Android acceptance pass.
- [ ] PayFast/Paystack callbacks verified in sandbox with signatures and idempotency.
- [ ] Only after the above: decide whether to retire legacy Worker browser access.

## Owner operating principle

Protect the ledger before adding features. A payment is not “paid” because a match looks plausible; a bank row is not a payment until explicitly confirmed; a backup is not a recovery plan until restored successfully; a role label is not authorization until the server enforces it. Keep these as hard release gates.
