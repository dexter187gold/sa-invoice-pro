## 6.53.0 — Collections chase UI

- **WhatsApp chase**: Age filters (All / 7+ / 14+ / 30+), portal/pay-online toggle, persisted last-chased timestamps, urgency highlight.
- **Pulse Home**: Chase list links to full queue; quick nav to `/wa-chase`.
- Closes the loop: overdue → WA message (optional portal link) → Pay Now.

## 6.52.0 — Portal quote polish + chase portal line

- **Client portal**: Decline quote prompts for optional reason; accept shows toast and jumps to Invoices when open balance exists; dual API path for decisions.
- **Chase pack**: Optional portal / pay-online line on collection messages.
- Pay Now remains test-key ready until live keys arrive.

## 6.51.0 — Professional Pay Now foundation

- **Payments (Paystack primary)**: Server routes for init / verify / webhook + payments ledger.
- **Client portal**: Professional **Pay Now** button on unpaid invoices, Paystack Inline popup, verify + thank-you flow, success toast.
- Dual-rail ready (PayFast stub in config). Env: `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`.

## 6.50.0 — Smart inbound WhatsApp suggest

- **Inbox**: Paste the client's inbound message → **Smart suggest** (local keyword match) fills the best ZA-tone reply. No network needed.
- Expanded bench quick replies: FRP/Google lock, screen/glass, battery, data recovery, warranty, ETA.
