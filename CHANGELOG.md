## 6.44.0 — Meta WhatsApp Cloud API + credit modal

- **src/lib/whatsapp.js** — `sendWhatsAppText`, `notifyJobStatus`, credential detection from Dev Portal secrets + settings
- **Server proxy** `POST /api/whatsapp/send` + Meta webhook GET/POST (verify token + ack)
- Tickets detail: **Send Cloud** button (falls back to wa.me when token missing or API errors)
- Job status message template with *bold* for WA
- Version files aligned (package.json, config.js, version.json, ROADMAP)

## 6.43.0 — Popups + owner radar expansion

- **Modal component** — reusable popup for create/edit (Escape + backdrop close, sm/md/lg)
- **Products / Employees / Petty cash** — forms open in popups; full list pages kept
- **Owner radar** extended to Products, Employees, Payroll, Reports, Bank import, Documents, Recurring
- Modal CSS scroll + mobile-friendly widths
- Master stability pass on list-page wiring (Invoices/Tickets restored earlier)

## 6.42.0

- Inbox replies prefer Cloud API when Meta credentials are set
- Fallback to wa.me remains; mode shown in UI
