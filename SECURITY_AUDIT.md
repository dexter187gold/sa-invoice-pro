# SA Invoice Pro — Security notes

This document records security practices and remediation guidance. It must never contain passwords, API tokens, private keys, or other live credentials.

## Backend security controls to verify

For the deployed sync service, verify the current implementation and deployment configuration for:
- Login and registration rate limits
- Explicit CORS allow-list for trusted browser origins
- Strong password policy and secure reset flows
- Admin routes requiring authenticated, authorised admin sessions
- Security headers on all responses
- Rate limiting and audit logging for sensitive operations

Do not treat this historical checklist as proof that a control is currently deployed. Validate the live service and its configuration before release.

## Frontend / APK practices

- Prefer short-lived credentials and clear authentication state on logout.
- Never log tokens, passwords, passcodes, or sensitive customer/device data.
- Read only public configuration from public config endpoints; never ship server secrets in the client bundle.
- Validate Google ID tokens cryptographically on the server before trusting identity claims.
- Keep PDF generation client-side where possible; send customer data to a backend only for a documented, necessary feature.
- Treat device passcodes and other repair-sensitive fields as secrets; do not store them in plaintext.

## Deployment secrets

Configure secrets in the deployment platform's secret manager/environment settings, never in source control or documentation. Expected variable names may include:

- `JWT_SECRET`
- `STATUS_API_TOKEN`
- `ADMIN_PASSWORD`
- `CORS_ORIGINS`

Use the exact names required by the currently deployed backend. Rotate any credential that has been committed to source control or otherwise exposed. Removing a secret from the latest file does not remove it from Git history; assess history cleanup and access-log review as part of incident response.
