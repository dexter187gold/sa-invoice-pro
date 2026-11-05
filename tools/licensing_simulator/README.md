# SA Invoice Pro licensing simulator

This is a deterministic, in-memory test environment. It is intentionally separate
from production licence storage, Render services, Cloudflare deployments and payment
gateways. All IDs, references and payments are simulation-only.

## Run

From the repository root:

    python -m unittest tests.test_licensing_simulator -v

No production credentials or external services are required.

## Simulated API routes

- POST /sim/register — create a test account (14-day trial, 7-day offer).
- POST /sim/owner/issue — issue a test licence with hour/day/month/year duration.
- POST /sim/owner/activate — start the term at activation, not issuance.
- POST /sim/owner/duration — change a test licence duration.
- POST /sim/clock/advance — advance the deterministic clock.
- GET /sim/trial/status — inspect trial/transition/limited state.
- GET /sim/trial/reminders — emit 7/5/3/1-day reminders once each.
- GET /sim/billing/quote — compare standard annual price with the two-month introductory saving.
- GET /sim/usage/invoices — count issued invoices only; no usage fees are charged.

## Safety model

- The simulator has no network client, gateway SDK, production database or production
  signing secret.
- A simulated payment reference can never activate a production licence.
- Test clock changes do not modify system time.
- Trial expiry preserves data; the 24-hour transition is restricted to dashboard,
  settings, licence, support, about and export. After the transition, only those
  limited routes remain available until a paid entitlement is activated.
- The introductory annual offer expires seven days after registration and is not
  stacked with another discount. The annual offer is ten monthly payments instead
  of twelve; monthly billing remains at its standard monthly price.
- Invoice volume is observed for analytics only, not billed or enforced.

This simulator validates proposed policy behaviour. Production APIs must still be
refactored to use the same policy module and pass integration/security tests before
the new policy is enabled for customers.
