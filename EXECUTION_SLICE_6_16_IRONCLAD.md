# 6.16 Operation Ironclad — execution plan

**Status:** Proposed execution slice; source audit in progress  
**Base:** `main` at `233dedb63a825daef4afd83ac34cca19c7df6107`  
**Branch:** `execution/6.16-operation-ironclad`  
**Product goal:** Make SA Invoice Pro dependable enough for real South African repair and field-service businesses to trust daily.

## Executive decision

Prioritise release confidence, data integrity, and the end-to-end money/job workflow over net-new feature count. Do not claim 95% completion until roadmap items are reconciled to testable acceptance criteria. Track roadmap coverage and production readiness as separate measures.

## Findings from the initial repository review

1. **Version drift:** `package.json` reports `6.15.0`, `version.json` reports `6.0.1`, and the top-level changelog still leads with `4.3.0`. Reconcile release metadata and document which source is authoritative before tagging a release.
2. **Credential exposure risk:** `SECURITY_AUDIT.md` contains what appears to be a live admin login credential. Treat it as compromised: rotate the credential and related secrets immediately, remove credentials from tracked documentation, and review access/logs. Removing it from the latest file does not erase Git history; consider history cleanup after coordinating with maintainers.
3. **Thin visible E2E surface:** the configured Playwright suite currently has a single smoke spec in `e2e/`. CI builds and runs Playwright, which is a useful base, but the visible suite does not yet demonstrate the critical business journeys described by the roadmap.
4. **Existing CI foundation:** `.github/workflows/e2e-smoke.yml` runs the build and Chromium Playwright tests on push and pull request to `main`. Expand existing gates instead of duplicating pipelines.
5. **Recent feature integration:** 6.15 wires client tags, cash forecast, and quote win-rate into the client and reports pages. These features should receive regression coverage and data-shape/edge-case checks.

These findings are based on repository files inspected; no local build, test run, production environment test, or full backend security audit is claimed by this document.

## P0 — Release blockers

### 1. Security response
- [ ] Rotate any exposed admin password and relevant production secrets immediately.
- [ ] Remove credentials from `SECURITY_AUDIT.md`; document environment-variable names and safe setup steps only.
- [ ] Review authentication, authorization, tenant/workspace isolation, CORS, public portal access, and logs for accidental sensitive data.
- [ ] Ensure no credential is printed in CI logs, client bundles, examples, or documentation.
- [ ] Record the remediation and verify the rotated credential works only through the intended secret store.

### 2. Release/version truth
- [ ] Define one authoritative release version source.
- [ ] Align `package.json`, `version.json`, app-visible version, changelog, and release tag.
- [ ] Add a small CI check that fails on unintended version drift.
- [ ] Ensure the release note reflects shipped, tested changes only.

### 3. Critical workflow test pack
Add Playwright coverage for the highest-value journeys, using isolated deterministic test data:
- [ ] App boots and core routes render without uncaught page errors.
- [ ] Create/edit client and preserve it after reload.
- [ ] Create quote and convert to invoice/job without losing or duplicating line items.
- [ ] Record partial payment and verify invoice balance, status, and receipt totals.
- [ ] Record a credit note/adjustment and verify totals remain internally consistent.
- [ ] Overdue invoice → reminder/collection action → promise-to-pay/follow-up.
- [ ] Client tags and report insights render correctly for empty, normal, and malformed/legacy records.
- [ ] Workspace export and restore preserve essential records.
- [ ] Verify mobile viewport layout for core invoice/job/payment paths.

### 4. Build and CI confidence
- [ ] Run export checks and production build on the working branch.
- [ ] Run the existing Playwright suite and new critical journey tests.
- [ ] Make CI failures visible and block release on failed P0 checks.
- [ ] Capture actual command results; do not mark a gate complete based on configuration alone.

## P1 — Data safety and sync

- [ ] Map every workspace write, push, pull, seed, restore, and merge path.
- [ ] Verify failed network requests remain visible and retryable rather than silently disappearing.
- [ ] Expose sync status: last successful push/pull, pending queue depth, and latest error.
- [ ] Test interrupted sync, repeated retries, duplicate submissions, stale device state, and malformed payloads.
- [ ] Define and test conflict behaviour; never silently overwrite newer user data.
- [ ] Verify a backup can be exported and restored on a clean browser/device.
- [ ] Document retention and recovery limits honestly.

## P1 — Quote-to-cash and repair-desk integration

- [ ] Audit the complete chain: client → quote → job card → invoice → payment → receipt → reconciliation.
- [ ] Ensure conversions are idempotent or explicitly prevent duplicate conversion.
- [ ] Ensure parts/labour, discounts, VAT, credit notes, partial payments, and balances use consistent calculations.
- [ ] Complete ticket-to-invoice only after verifying source ticket data and preventing double billing.
- [ ] Test WhatsApp number normalisation, opt-out/quiet-hour behaviour where supported, and honest failure states.
- [ ] Treat payment provider webhooks as untrusted input: verify signatures, idempotency, and server-side amount/currency before marking paid.

## P1 — Access, licensing, and privacy

- [ ] Test authorization at the server/data layer, not just route or button visibility.
- [ ] Verify team-seat and tenant boundaries with positive and negative tests.
- [ ] Check licence activation, device binding, expiry/offline behaviour, and recovery.
- [ ] Review sensitive repair-device fields; do not store passcodes or secrets in plaintext.
- [ ] Verify consent, export, deletion/retention paths, and access logging against the actual data model.
- [ ] Obtain appropriate South African tax, payroll, and POPIA review for compliance claims; do not label estimates as authoritative filings.

## Definition of done

A slice item is done only when:
1. Acceptance criteria are written and reproducible.
2. UI, persistence, authorization, error/empty/offline states, and migrations (if any) are handled.
3. Automated tests cover success and meaningful failure cases.
4. Build/export checks and relevant E2E tests pass in CI.
5. User-facing copy and documentation match actual behaviour.
6. The roadmap status is updated based on evidence, not implementation intent.

## Release gate

Do not call the slice release-ready while any of these remain:
- known exposed or unrotated credentials;
- critical data-loss or cross-tenant access defects;
- failed production build/export checks;
- failed critical journey tests;
- payment totals or invoice balances that disagree;
- undocumented data migration or recovery hazards.

## Measurement

Maintain two scores:

- **Roadmap delivery:** weighted accepted roadmap criteria, with evidence and explicit exclusions.
- **Release readiness:** build/test gate results, open severity-ranked defects, security response, restore verification, and successful critical workflows.

The target is 95%+ roadmap completion only after the remaining scope is audited and accepted. Release readiness requires all P0 gates to pass regardless of the percentage.

## Suggested execution order

1. Security credential rotation and docs remediation.
2. Establish baseline build, export, E2E, and CI results.
3. Resolve version drift and add a guard.
4. Expand deterministic critical journey tests.
5. Fix the highest-risk failures found by those tests.
6. Harden sync/restore and quote-to-cash paths.
7. Update roadmap status with evidence and open blockers.
