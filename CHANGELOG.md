## 6.52.0 — Portal quote polish + chase portal line

- **Client portal**: Decline quote prompts for optional reason; accept shows toast and jumps to Invoices when open balance exists; dual API path for decisions.
- **Chase pack**: Optional portal / pay-online line on collection messages.
- Pay Now remains test-key ready until live keys arrive.

## 6.51.0 — Professional Pay Now foundation

- **Payments (Paystack primary)**: Server routes for init / verify / webhook + payments ledger.
- **Client portal**: Professional **Pay Now** button on unpaid invoices, Paystack Inline popup, verify + thank-you flow, success toast.
- Dual-rail ready (PayFast stub in config). Env: `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`.
- Roadmap elevated: trusted payment experience is now a north-star.

## 6.50.0 — Smart inbound WhatsApp suggest

- **Inbox**: Paste the client's inbound message → **Smart suggest** (local keyword match) fills the best ZA-tone reply. No network needed.
- Expanded bench quick replies: FRP/Google lock, screen/glass, battery, data recovery, warranty, ETA.
- Desk responds faster to common enquiries while staying on the app (Cloud or wa.me).

## 6.49.0 — Smart WhatsApp replies

- **Inbox**: Paste inbound client message → **Smart suggest** (local keyword match) fills a ZA-tone reply. No network needed.
- **QUICK_REPLIES** expanded: FRP/Google lock, screen crack, battery swap, data recovery, ETA, warranty note.
- Desk responds faster to common bench enquiries while staying on the app (Cloud or wa.me).

## 6.48.0 — WhatsApp desk replies

- **Inbox**: Expanded QUICK_REPLIES — ready for collection, waiting on parts, quote follow-up, payment received, bring ID + accessories, price/diagnose next, booking confirmed (ZA tone).
- Desk can respond to pending WhatsApp clients faster without leaving the app (Cloud or wa.me).
