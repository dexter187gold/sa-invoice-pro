# SA Invoice Pro Licence Lab

A separate Cloudflare Pages pre-production simulator. It is deliberately isolated from the production licence API and customer database.

## Safety
- Uses a dedicated D1 database: `saip-licence-simulator`.
- Only synthetic accounts are stored.
- Paystack integration refuses any key not beginning with `sk_test_`.
- Successful access grants are limited to synthetic accounts in this simulator.
- Never add production keys, customer exports, or production database bindings.

## Cloudflare Pages secrets
Configure these as **encrypted secrets** for the Pages project in both Production and Preview environments:
- `SIMULATOR_ADMIN_PASSWORD`: a strong unique password you choose for this private lab.
- `SESSION_SECRET`: a random secret of at least 32 bytes.
- `PAYSTACK_SECRET_KEY`: your Paystack test secret key only (`sk_test_...`).
- `PAYSTACK_WEBHOOK_SECRET`: the Paystack Test Mode webhook signing secret (`whsec_...`).

The Paystack public key is not required because checkout is initialised server-side and the hosted authorization URL is used. Do not place a secret key in browser code.

## Paystack
Set the Test Mode webhook URL to:
`https://saip-licence-simulator.pages.dev/api/paystack/webhook`

The webhook handler supports the current `Paystack-Signature` format using `PAYSTACK_WEBHOOK_SECRET` (`whsec_...`), enforces a 300-second timestamp window, and also supports legacy `x-paystack-signature` while Paystack still sends it. It then re-verifies the transaction against Paystack and checks amount, currency and reference before granting a synthetic licence.

## Local safety tests
The existing Python simulator remains the deterministic reference harness:
`python -m pytest -q tests/test_license_simulator.py tests/test_license_simulator_safety.py`

The visual dashboard uses its own D1 store and simulated clock. It does not call the live SA Invoice Pro licence API.
