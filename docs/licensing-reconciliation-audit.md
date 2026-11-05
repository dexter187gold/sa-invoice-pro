# SA Invoice Pro licensing reconciliation audit

Audit baseline: main branch commit c391b163cb3bb3e13361cf8518f1ee4a9f84961f (6 November 2026 review context).

## Approved direction for the next implementation phase

- Trial: 14 calendar days from first server-recorded account registration.
- Introductory offer: 7 days from registration, once per immutable account; annual purchase only.
- Annual offer: ten monthly-equivalent payments (two months' value saved); no stacking.
- Monthly pricing: Solo R187, Shop R374, Multi-Branch R749, Enterprise from R1,499 (custom quote).
- Standard annual prices: Solo R2,244, Shop R4,488, Multi-Branch R8,988.
- Introductory annual prices: Solo R1,870, Shop R3,740, Multi-Branch R7,490.
- These prices are rounded to the nearest rand after applying the requested 25% reduction to the previous proposed monthly amounts.
- Invoice volume: telemetry only initially; no invoice-count billing or hard caps until usage data justifies it.
- VAT: operator has stated that SA Invoice Pro is not VAT-registered; prices should be shown as the payable amount without adding or representing VAT as collected. Revisit if registration status changes.
- Trial access: dashboard, clients, invoices, quotes, tickets, products, company/settings, help/support, about and licence page. Paid accounting, payroll, team, branches, APIs and advanced modules remain tier-gated.
- Trial expiry: 24-hour transition with read-only dashboard, settings, licence, support, about and export; thereafter preserve data and allow settings, support, licence and export, but block business mutations until paid activation.
- Owner test durations: hours, days, calendar months and years. Term begins at activation, not issue. Owner can change a term or extend an existing expiry. All timestamps are UTC and server-authoritative.
- Trial reminders: 7, 5, 3 and 1 days before expiry. Delivery must be idempotent and cross-device.

## Confirmed production inconsistencies requiring correction

1. src/lib/license.js defines ALPHA_TRIAL_DAYS = 30, and starts the trial in browser-local storage/IndexedDB.
2. src/lib/deviceLicense.js has ALPHA_SOFT_MODE = true, and always returns canUseDesk: true, including after trial expiry.
3. src/lib/accessControl.js limits unlicensed users to clients, invoices and quotes, while settings/licence are always reachable. This differs from the proposed expanded 14-day evaluation.
4. src/lib/licenseTiers.js still displays the previous R1,999 / R4,999 / R11,999 annual guide prices and a 7-day trial.
5. license_plans.py still uses the previous annual amounts and has no introductory-offer model.
6. license_server.py defines trial as 7 days and Shop as 730 days in PLAN_DAYS.
7. license_owner_ops.py independently defines Trial as 7 days and Shop as 730 days; paid annual terms are therefore inconsistent.
8. Legacy /issue accepts a plan code and stores fixed day counts. It does not provide owner-selected hour/day/month/year terms.
9. license_routes_v24.py activation records activatedAt, but does not persist/enforce a canonical expiresAt in the modern verification path.
10. license_server.py legacy activation computes an expiry response but does not provide one consistent persisted expiry contract for all verification paths.
11. license_billing.py on main currently exposes only /api/billing/plans. It does not register the checkout, webhook/ITN, verification and claim routes implied by the frontend.
12. src/lib/billing.js and src/pages/License.jsx expect checkout and Paystack verification routes that do not match the current server stub. Payment route restoration and contract tests are a release blocker before accepting new payments.
13. license_server.py prints a startup message claiming PayFast checkout/ITN/claim routes are registered even though the current billing module is a plans-only stub. This log must be corrected when billing is reconciled.
14. src/config.js points the app at https://saip-license.onrender.com. A second legacy Render service, sa-invoice-license.onrender.com, also exists and points to this repository. Do not disable either service or migrate records until the authoritative service and backing data store are verified.

## Required implementation sequence

### P0 — Freeze and map production contracts
- Identify the authoritative Render licence service and verify whether both services share the same Git-backed data store without exposing secrets.
- Snapshot/backup licence records and payment ledger before any schema migration.
- Restore and contract-test Paystack and PayFast routes. Paystack is the intended primary provider; do not trust browser return URLs or amounts.
- Ensure duplicate webhooks and repeated verification are idempotent.

### P1 — One server-authoritative policy
- Create one shared plan/trial/offer/duration policy used by billing, owner operations, activation, verification and admin UI.
- Persist registeredAt, trialExpiresAt, offerExpiresAt, issuedAt, activatedAt, expiresAt, durationValue, durationUnit, plan, seats and immutable account ID.
- Use calendar-aware month arithmetic and UTC timestamps.
- Verify expiry on every authoritative verification/heartbeat and paid API operation.
- Do not allow local storage, client clocks, device IDs or browser state to extend an entitlement.

### P2 — Owner licence control centre
- Add secure owner controls for issuing, activating, shortening, extending and expiring test/customer terms in hours, days, months and years.
- Display registration, offer, trial, issue, activation, expiry, renewal, plan, seats, device bindings, usage and verified transactions.
- Require reason, confirmation and audit record for every entitlement change.
- Preserve payment history and customer data during plan/status changes.

### P3 — Trial, offer and access
- Enforce the 14-day trial and 7-day annual offer on the server.
- Use account-level offer eligibility and one-time redemption.
- Add 7/5/3/1-day reminder scheduling with deduplication.
- Enforce read-only transition and post-trial access on server APIs as well as routes.
- Never delete or hold customer data hostage at expiry.

### P4 — Simulation, CI and controlled rollout
- Keep the simulator isolated from production storage and payment providers.
- Add deterministic scenarios for registration, expiry, owner duration controls, payment success/failure, webhook replay, renewals, cancellation, seat limits, tenant isolation and clock manipulation.
- Require unit, security, production build and E2E checks before staging promotion.
- Run a staging canary with test credentials and synthetic accounts before production.
- Keep rollback path and licence data snapshot available.

## Machine-assisted improvement policy

Do not let an ML model rewrite or deploy production code autonomously. Use an evidence-based improvement loop: collect privacy-minimised diagnostics, classify failures, propose fixes, add regression tests, run CI, stage, canary, and promote only after explicit release gates. Automated dependency/security upgrades may be prepared in branches and merged only when required tests pass. Maintain human approval and immediate rollback for licensing, payment, privacy and data migrations.
