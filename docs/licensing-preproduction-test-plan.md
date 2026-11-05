# SA Invoice Pro licensing — pre-production test plan

## Environment boundary

The simulator is an in-memory test harness. It does not create a browser-accessible staging site, call Render, use Paystack/PayFast, or read/write real customer licences. Use synthetic emails and IDs only. Do not enter production activation keys, customer data, payment references, or secrets.

## Gate A — local simulator

From a clean checkout of the licensing feature branch:

```bash
python -m pip install pytest
python -m pytest -q tests/test_license_simulator.py tests/test_license_simulator_safety.py
```

Expected: all tests pass. Any failure blocks staging work until fixed.

### Scenarios to verify

1. Register two synthetic accounts. Confirm each receives a 14-day trial and a separate 7-day introductory-offer window.
2. Move the simulated clock to 7, 5, 3 and 1 days before trial expiry. Each reminder must appear once per account only.
3. Advance to the exact trial expiry. Confirm the account enters read-only transition and business mutations are denied.
4. Advance 24 hours beyond expiry. Confirm the account enters limited read-only mode; export/settings/support/licence remain available and invoices/tickets/business mutations are denied.
5. Issue a test licence for 3 hours. Confirm it remains issued until activation and expires 3 hours after activation, not issuance.
6. Repeat with 1 day, 1 calendar month and 1 year. Verify month-end clamping and UTC timestamps.
7. Change and extend test terms. Confirm audit events record the change and an expired licence does not silently retain paid access.
8. Attempt duplicate activation, invalid units, zero/negative duration, over-10-year duration, seat-limit violations and backwards clock changes. Each must be rejected.
9. Activate a licence for tenant A. Confirm tenant B cannot use it or see tenant A's invoice usage.
10. Redeem the annual introductory offer once. Confirm it cannot be redeemed again for the same account and does not affect another account.
11. Confirm invoice-volume reporting counts issued invoices only and never charges or blocks an account.
12. Try production billing paths through the simulator. They must return not found; the simulator must not proxy production.

## Gate B — staging integration (not yet available)

Before calling the product ready for user testing, deploy a separate staging licence API and app target with:
- Separate database or isolated staging namespace and synthetic tenant IDs.
- Separate signing keys and payment-provider test credentials.
- Explicit environment banner: STAGING / TEST DATA ONLY.
- No production customer lookup, production payment webhook, production licence signing key, or shared writeable licence store.
- A tested reset mechanism that deletes only synthetic staging records.
- Server-side expiry checks on activation, verification, heartbeat and every protected mutation endpoint.

Never use a production Render service as a staging environment by changing its environment variables in place.

## Gate C — integration and security tests

Required automated coverage before beta:
- API contract tests for every frontend checkout, Paystack callback/verification, webhook, licence claim, activation, device status and verification route.
- Payment amount/currency/reference verification on the server; browser return parameters are not proof of payment.
- Webhook signature verification, replay/idempotency and duplicate-event tests.
- Server-authoritative expiry tests with manipulated client clocks and stale local storage.
- Cross-account and cross-device isolation tests, including attempts to substitute account IDs, licence IDs and activation tokens.
- Role/owner authorization tests for issue, activate, shorten, extend, revoke and inspect operations.
- Seat/device cap tests and sign-out/sign-in subscription persistence tests.
- Data-preservation tests: expiry, cancellation and failed payment must not delete invoices, clients or company records.
- Browser E2E for registration, trial access, reminder UI, expiry transition, restricted state, payment test-mode activation, renewal and sign-out/sign-in.

## Gate D — beta acceptance

Start a small invited beta only when:
- Licence security regression workflow passes.
- Unit tests pass.
- Production build passes.
- Playwright E2E passes against the isolated staging target.
- API contract and payment test-mode suites pass.
- No critical/high security finding remains open.
- Backup/restore and rollback have been rehearsed.
- Owner admin changes are audited and reversible.
- A human reviewer approves the release candidate.

## Current status

The isolated simulator and its regression tests are in PR #41. The latest previously inspected security and E2E workflows passed for the earlier PR head. Production reconciliation is not complete, and a browser-accessible staging environment has not yet been provisioned. Therefore this document is a test procedure, not a declaration that production or beta is ready.
