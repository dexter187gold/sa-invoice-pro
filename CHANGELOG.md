## 6.45.2 — Payments syntax + select fix

- Fix corrupted `text.replace(/\*/g)` in Payments.jsx (blocked vite build)
- Fix broken `<select className="select" value={method}>` attribute

## 6.45.1 — CI export fix

- Restore `SA_CONFIG` and `VAT_RATE_DEFAULT` exports on `src/config.js` (unblocks check-exports / build)
- Align README title version with package.json

## 6.45.0 — Credit modal UI + portal sync fix

- **Invoices**: CN button opens CreditNoteModal (amount + reason; partial/full)
- **Quotes**: portal Apply queue + Pull cloud decisions

## 6.44.0 — Meta WhatsApp Cloud API

- `src/lib/whatsapp.js` + server proxy + Tickets Send Cloud button
