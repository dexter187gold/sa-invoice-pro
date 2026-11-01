# Licence key delivery (email + SMS)

After PayFast ITN or Paystack verifies payment, `saip-license` issues a `SAIP-…` activation key and calls `license_notify.deliver_license_key`.

## Render env on **saip-license**

### Email (required for inbox delivery)
- `SMTP_HOST` — e.g. `smtp.gmail.com`
- `SMTP_PORT` — `587` (STARTTLS) or `465` (SSL)
- `SMTP_USER` — mailbox login
- `SMTP_PASS` — app password
- `SMTP_FROM` — e.g. `sainvoicepro@gmail.com`

### SMS (optional)
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- **Or generic:** `SMS_WEBHOOK_URL` — POST JSON `{ "to", "body" }`

### Already used
- PayFast / Paystack secrets
- `SA_LICENSE_SERVER_URL=https://saip-license.onrender.com`

## Customer flow
1. Buy plan on License page (email + optional phone).
2. Paygate confirms → server issues key → email/SMS.
3. User pastes key → Activate → server validates → success splash.

## Files
- `license_notify.py` — delivery
- `license_billing.py` — ITN + Paystack fulfill hooks
- `src/pages/License.jsx` — key entry + splash
- `src/lib/billing.js` — phone on checkout
