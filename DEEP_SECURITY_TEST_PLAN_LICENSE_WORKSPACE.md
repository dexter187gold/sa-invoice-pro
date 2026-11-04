# Deep Security Test Plan — Licence Integrity & Workspace Privacy

Run only against isolated staging tenants and disposable test licences. Never revoke a real customer's production entitlement during destructive tests.

## Fixtures
- Two test accounts A and B with distinct immutable user IDs and workspaces.
- Unique sentinel records in each workspace.
- Valid, expired and revoked test entitlements.
- Two separate browser contexts, one clean profile and one offline-capable context.
- Test-only server observability and revocation controls. Do not ship a licence bypass/backdoor.

## Licence integrity — adversarial cases

| ID | Attack / scenario | Expected secure result |
|---|---|---|
| LIC-01 | Edit local licence key, metadata, activation token and plan flags in IndexedDB | Signature/entitlement validation rejects tampering; client cannot grant paid access. |
| LIC-02 | Copy A's licence records into B's browser profile | Device/account binding fails; B gets only its own entitlement. |
| LIC-03 | Change local hardware ID to another device ID | Server detects mismatch; no activation. |
| LIC-04 | Replay an old activation response | Nonce, issued-at, expiry and replay checks reject it. |
| LIC-05 | Revoke server-side while online | Next authoritative check removes paid access within documented propagation window. |
| LIC-06 | Revoke while offline | Bounded offline grace policy applies; never indefinite entitlement. |
| LIC-07 | Move system clock backwards/forwards | Server time and signed timestamps prevent expiry extension. |
| LIC-08 | Stale local `licensed=true` after expiry | Paid routes and protected API calls deny access. |
| LIC-09 | Timeout/5xx during validation | Sensitive paid actions fail closed; data is preserved; retry state shown. |
| LIC-10 | Concurrent activations beyond seat limit | Server serializes activation and enforces seats atomically. |
| LIC-11 | Change account email | Entitlement follows immutable server account ID, not mutable email. |
| LIC-12 | Sign out, auto-lock, restart browser, sign in | Valid subscription remains recognised without unnecessary reactivation. |

## Workspace privacy — cross-account and cross-workspace cases

| ID | Attack / scenario | Expected secure result |
|---|---|---|
| WS-01 | A creates sentinels, signs out, B signs in | B sees no A record in lists, search, dashboard, export or cached components. |
| WS-02 | Switch A → B → A repeatedly | Each restores only its own snapshot; no stale workspace merge. |
| WS-03 | Delay A's sync response until B signs in | Response discarded by account/session generation guard. |
| WS-04 | Replay A's queued push while B is active | Server rejects tenant mismatch; queues partitioned by account. |
| WS-05 | Restore A backup while B is signed in | Blocked or requires fresh authentication as A; never merged. |
| WS-06 | Import partial/malformed backup | Dry-run reports errors; atomic rollback preserves original workspace. |
| WS-07 | Crash midway through restore | Transaction rolls back; recovery snapshot remains. |
| WS-08 | Two tabs use different accounts | Per-tab identity and server authorization prevent cross-tab leakage. |
| WS-09 | Browser back/cache after sign-out | Private pages do not render stale data; APIs require valid session. |
| WS-10 | Search, reports, command palette and PDF previews | No records or file URLs from another account/workspace. |
| WS-11 | Change active company inside one account | Only selected company's records and company-scoped settings appear. |
| WS-12 | Reset/delete workspace | Re-authentication, confirmation, snapshot, audit event and rollback required. |

## Authentication, roles and recovery
- Expired access token, revoked refresh token, refresh-token reuse, concurrent refresh and logout-all.
- Session fixation, stale local session, forged role in localStorage, direct owner route and direct API call.
- Staff attempts to change owner email, PIN, licence, bank settings, retention or role.
- Recovery code brute force, reuse, expiry, enumeration and email mismatch.
- CSRF, cross-origin requests, malformed/oversized payloads and IDOR on ID-based endpoints.
- Auto-lock at 5/15/30 minutes, background-tab expiry, sleep/wake, mobile touch/keyboard activity and unlock without licence loss.

## Financial/data integrity
- Bank import duplicates, reversals, negative amounts, same-amount invoices and ambiguous matches.
- Applying a match must never mark an invoice Paid unless a confirmed payment is created and linked to that exact invoice.
- Concurrent payment updates, stale sync, duplicate idempotency keys, partial sync and rollback.
- Exports/backups exclude passwords, bearer tokens, activation secrets and server credentials.
- Logs redact credentials, recovery codes, bank account numbers and customer personal data.

## Automation and pass criteria
1. Run unit tests and production build.
2. Run Playwright in a production-like staging environment using two separate browser contexts.
3. Capture traces, screenshots, request IDs and redacted reports for failures.
4. Repeat critical tenant-isolation and licence tests at least 20 times with randomized account-switch timing.
5. Require zero cross-tenant disclosures, zero local-only entitlement grants, zero destructive data loss, and zero critical/high findings before beta.
6. Hiding a UI control is not authorization: direct API and direct-route checks must also deny access.

## Current harness limitation
The existing E2E helper injects a synthetic local session. This supports UI smoke tests, not proof of server authentication or licence security. Full LIC/WS execution requires staging licence APIs, test fixtures and server-side observability. Keep these tests separate from ordinary smoke tests; never claim licence integrity from client-only assertions.
