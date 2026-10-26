# P1–P10 Owner Mega-Execution — SA Invoice Pro

**Execution posture:** ship a trustworthy repair-desk/business system, not a checklist of features. Customer data integrity, customer-facing journeys, access control, recovery, and repeatable release verification outrank cosmetic scope.

**Snapshot date:** 2026-10-26  
**Baseline roadmap release:** 6.15.0  
**Current execution branch:** `execution/6.16-operation-ironclad`  
**Related backend branch:** `execution/client-portal-rescue` in `dexter187gold/saip-sync`

## Executive status

- The existing roadmap reports **~78% overall feature completion**. This is the roadmap's own headline estimate, not a launch-readiness score.
- The ten phase percentages listed in `ROADMAP_STATUS.md` average **66.7% unweighted**. That is a transparent diagnostic average only; it does not replace the roadmap's weighted estimate.
- **Release readiness is not green.** The last recorded GitHub Actions run passed unit tests and the production build, but failed at Playwright E2E. The E2E import has now been corrected on this branch; a fresh passing run is still required.
- The client portal is treated as a **P1 release blocker** until a real generated link is proven to load the correct customer data on mobile, including failure/expiry behaviour.
- The Render `saip-sync` service remains the existing backend. Do not overwrite its service or deploy unrelated app code into it.

## Owner's priority rules

1. No release with known customer data loss, cross-customer data exposure, a stuck primary customer journey, or failing release-gate tests.
2. Every sync result must be checked before the UI claims success or generates a share link.
3. Every public link must fail clearly and safely; never leave a customer at an indefinite spinner.
4. A feature is not complete because a component exists. It is complete when its critical path is tested with realistic records and a production-like environment.
5. Security defaults, secret rotation, restore tests, and customer-data privacy are release work—not optional polish.

## P1–P10 execution board

| Phase | Baseline | Owner outcome | Current state / next proof |
|---|---:|---|---|
| **P1 Foundation & release integrity** | 94% | Reproducible build, consistent versions, safe secrets, green release gate | Version checks and unit tests were added in the current execution. E2E previously failed; ESM test import fixed, but rerun must pass. A previously committed admin credential requires live rotation and history/access review. |
| **P2 Desk / jobs** | 75% | A technician can open, update, track, and close a job without losing customer/device context | Regression-test the job lifecycle, attachment/document behaviour, status transitions, and offline recovery. Not yet production-verified in this slice. |
| **P3 Money / quote-to-cash** | 84% | Quote → invoice → payment → balance and reporting stay consistent | Forecast due-today bug fixed with unit coverage. Next: payment allocation, partial payments, tax rounding, credit notes, exports, and duplicate-submit tests. |
| **P4 Client portal** | 82% | A customer link displays only that customer's invoices/quotes and never hangs indefinitely | **P1 blocker.** Frontend now checks sync results and supplies full supported snapshot fields before link creation/refresh. Backend rescue adds request timeout, retry/error state, HTML escaping, and a regression test. Must pass CI and real-link smoke test before closure. |
| **P5 Team / branch** | 68% | Permissions and branch workspaces cannot cross-contaminate data | Verify role gates, invite expiry/revocation, branch boundaries, and owner/member access. No new production proof in this slice. |
| **P6 Communications** | 54% | WhatsApp/email messages are correct, actionable, and linked to valid records | Validate South African number normalization, link copy/open flows, reminder accuracy, and delivery/error states. |
| **P7 Intelligence** | 38% | Forecasts and insights are trustworthy, explainable, and useful | Keep outputs subordinate to ledger truth. Add fixture-based forecast, aged debt, win-rate, and cash-flow tests before expanding AI/automation scope. |
| **P8 License / commercial** | 58% | Entitlements and expiry behave predictably without locking out legitimate customers | Test activation, renewal, expiry, clock skew, offline grace, and account recovery. Keep license state separate from financial records. |
| **P9 Platform / sync** | 56% | Sync, backup, restore, and deployment are observable and recoverable | Validate merge/overwrite rules, push failures, backup restore, Render cold start, and cloud-data durability. Never interpret a failed push as success. |
| **P10 Moat / compliance** | 58% | POPIA-minded access, auditability, device/job provenance, and SA business fit | Review data minimisation, retention/deletion, export, audit events, device passport privacy, and customer-consent language. Do not claim compliance from a checklist alone. |

## Work completed in this execution slice

- Added version-consistency checks to the app's prebuild path.
- Fixed a forecast edge case where invoices due today could be marked overdue after noon; added unit tests for due-today, overdue, partial balance, paid, and credit records.
- Added unit tests to CI before the production build.
- Converted Playwright configuration to ESM and corrected the E2E spec import to ESM after the prior Playwright job failed.
- Removed a hard-coded admin credential from the current app security audit file; **live credential rotation and Git-history cleanup are still outstanding**.
- Added portal preflight sync validation in the client page and link refresh card so failed sync does not silently create a link against stale cloud data.
- Began backend portal hardening on the separate `saip-sync` branch: bounded API wait, visible retry/error state, HTML escaping of customer-controlled values, and a regression test.

## Mandatory acceptance gates before calling this done

- [ ] App unit tests pass.
- [ ] Production build passes.
- [ ] Playwright E2E passes in CI.
- [ ] Backend portal regression tests pass in CI.
- [ ] Create a link for a real test customer with at least one invoice and one quote.
- [ ] Open link in a fresh browser/mobile context and verify customer/company name, invoice number, status, and balance are visible.
- [ ] Verify another customer's records cannot be retrieved through the first customer's token.
- [ ] Verify invalid, revoked, expired, offline, and slow-server cases show a useful message and retry path—not an infinite Loading state.
- [ ] Verify failed cloud sync prevents link creation and does not report success.
- [ ] Confirm no unintended production service or main branch was modified.
- [ ] Rotate the previously exposed live admin credential and review Git history/access logs.
- [ ] Confirm backup/restore and sync durability with a disposable test workspace.

## Progress reporting rules

Report three separate numbers, not one misleading percentage:

1. **Feature coverage:** use the roadmap estimate, currently ~78% reported.
2. **Phase average:** current phase values average 66.7% unweighted.
3. **Release confidence:** status is **BLOCKED / not yet verified** while E2E is unconfirmed, portal acceptance is unproven in a real browser, and credential rotation remains outstanding.

Do not mark a gate complete based on a code edit alone. Record the CI run, deployment SHA, and observed result.
