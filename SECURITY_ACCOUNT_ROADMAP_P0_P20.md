# SA Invoice Pro — P0–P20 Security, Identity & Account Control Roadmap

**Status:** proposed execution baseline. P0–P3 are release gates; later items follow in dependency order.  
**Principle:** licensing is entitlement, identity is authentication, workspace data is tenant data, and device activation is device trust. Never treat one as proof of another.

## P0–P5 — stop data exposure and account lockout

| Priority | Outcome | Acceptance criteria |
|---|---|---|
| **P0** | Freeze destructive changes and protect recovery | Every reset/import/switch creates a verified snapshot; destructive actions require re-authentication + explicit confirmation; no default factory PIN in production. |
| **P1** | Strict account/workspace isolation | Records scoped to immutable user ID + workspace ID; switching clears memory before loading; no prior-user merge. |
| **P2** | Licence integrity without false deactivation | Server-signed entitlement verified independently of local flags; device activation survives normal sign-out/lock; account switch cannot copy another account's entitlement. |
| **P3** | Secure sign-in, sign-out and session lifecycle | Visible sign-out; server revocation; refresh-token rotation; expiry; logout clears tokens/private cache but preserves only policy-approved device proof. |
| **P4** | Owner recovery | Verified email/recovery codes, rate limits, one-time use, expiry and audit trail; no support-only PIN bypass. |
| **P5** | Permission and role enforcement | Server-side RBAC on every protected operation; deny by default; role changes require owner re-authentication and audit. |

## P6–P10 — protect devices, data and billing

| Priority | Outcome | Acceptance criteria |
|---|---|---|
| **P6** | Device/session management | Owner lists devices/sessions, revokes one/all, sees last active/browser; revocation takes effect server-side. |
| **P7** | Configurable security controls | Auto-lock 5/15/30/custom, re-auth on resume, optional WebAuthn/biometric unlock, lock-on-tab-hide. |
| **P8** | Backup/restore integrity | Versioned schema, checksum/signature, preview/dry-run, conflict report, atomic restore, rollback; licence/secrets excluded. |
| **P9** | Tenant-safe sync | Every payload carries authenticated tenant/workspace identity; reject mismatches; concurrency/version checks; no last-write-wins for financial status. |
| **P10** | Billing/entitlement audit | Entitlement history, renewals, expiry/grace/offline rules, activation count and reason codes; server is source of truth. |

## P11–P15 — personal profile and owner control centre

| Priority | Outcome | Acceptance criteria |
|---|---|---|
| **P11** | Dedicated Personal Profile | Account identity separated from Company Profile; preferences saved per user and synced securely. |
| **P12** | 30+ profile preferences | Individually editable controls, validation, safe defaults, reset-to-default and sync status. |
| **P13** | Team, roles and invitations | Invite, suspend, reactivate, assign role/module permissions, seat limits, invitation expiry and audit. |
| **P14** | Privacy and data rights | POPIA-aligned consent, export, correction, retention, deletion workflow and access log. |
| **P15** | Owner security dashboard | Security score, sign-in alerts, sessions, licence, backup health, sync integrity and recovery requests. |

## P16–P20 — assurance and operational maturity

| Priority | Outcome | Acceptance criteria |
|---|---|---|
| **P16** | Security event ledger | Append-only events for auth, roles, licence, devices, exports, restores, resets and denied access. |
| **P17** | Abuse resistance | Rate limits, backoff, CSRF/origin protections, secure headers, validation, replay protection and alerting. |
| **P18** | Automated security regression suite | Unit + API + browser tests for entitlement tampering, tenant isolation, stale sessions, restore rollback, role escalation and concurrency. |
| **P19** | Release/deployment gates | Build, unit, E2E, dependency audit, secret scan and migration checks required before production; health and rollback verified. |
| **P20** | Independent review and beta sign-off | Threat model reviewed, high/critical findings closed, recovery drill passed, evidence retained, beta checklist signed. |

## Personal Profile — preference catalogue (30 controls)

1. Display name; 2. Avatar; 3. Login email (verified change); 4. Username; 5. Password change; 6. Recovery email; 7. Recovery codes; 8. Preferred language; 9. Region; 10. Time zone; 11. Date format; 12. Time format; 13. Currency display; 14. Number/decimal format; 15. Theme; 16. Accent colour; 17. Density/compact mode; 18. Default landing page; 19. Navigation layout; 20. Notification channels; 21. Email notification categories; 22. Push notification preferences; 23. Quiet hours; 24. Auto-lock duration; 25. Re-authentication for sensitive actions; 26. Trusted devices; 27. Active sessions; 28. Default workspace; 29. Accessibility/reduced motion; 30. Data export/privacy controls.

**Data ownership boundary:** personal preferences belong to the authenticated user; tax/banking/branding belongs to a company workspace; operational defaults belong to that workspace; device licence proof belongs to device activation; server entitlements belong to the licence service.

## Delivery gates

- P0–P5 before beta testers.
- P6–P10 before team rollout.
- P11–P15 before positioning the app as a full owner/admin platform.
- P16–P20 before general availability.
- No priority is complete from UI alone: require implementation, automated tests, server-side enforcement where applicable, and production-like evidence.
