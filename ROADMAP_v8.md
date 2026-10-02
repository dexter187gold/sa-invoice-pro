# SA Invoice Pro — Roadmap (post v8.0.0)

## 10 major critical updates (next)

1. **Native WhatsApp Business API** — template messages, delivery receipts (Meta cloud API), not only wa.me deep links.
2. **Transactional email API** — Resend / SendGrid / Amazon SES with PDF attachments from the app (not only mailto:).
3. **Background sync queue** — offline actions (create invoice, ticket update) queued and flushed when online.
4. **Real-time ticket SLA clocks** — countdown timers, breach alerts via WA/email.
5. **Customer portal (read-only link)** — pay / view invoice without logging into full app.
6. **Bank feed auto-import** — Open Banking / CSV watch folder + smarter matching ML rules.
7. **Multi-user roles** — owner / bookkeeper / technician permissions per company.
8. **Push notifications (PWA)** — overdue invoices, ticket assigned, license expiry.
9. **SARS eFiling export pack v2** — validated IRP5 / EMP201 style extracts where applicable.
10. **Performance shell** — code-split pages, virtualized long lists, Web Worker for PDF/CSV.

## Shipped in v8.0.0

- Faster navigation (rAF + loading placeholder + nav lock)
- loadData short-circuit cache (2.5s)
- WhatsApp + Email for invoices, quotes, tickets, clients
- Payment reminders via WhatsApp
- SA phone normalisation for wa.me/27…
- Safer share when document/client missing
