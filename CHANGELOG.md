## 6.46.0 — WhatsApp chase queue (wa.me + Cloud dual path)

- **New page** `/wa-chase` — staff queue for open invoices + collection jobs
- **Open next** walks the queue; each row Preview / Send
- **Dual path**: `sendWhatsAppText` uses Meta Cloud when credentials exist, else `wa.me` (staff taps Send)
- Live demo example (082 123 4567) shows the exact message + link shape
- Nav: Money section **WA chase**; Payments header link
- `chasePack.js`: `waMeUrl`, collection job messages, live example builder

## 6.45.2 — Payments syntax + select fix

- Fix corrupted `text.replace(/\*/g)` in Payments.jsx
- Fix broken select className attribute

## 6.45.1 — CI export fix

- Restore `SA_CONFIG` and `VAT_RATE_DEFAULT` exports

## 6.45.0 — Credit modal UI + portal sync

- CreditNoteModal on Invoices; Quotes portal queue
