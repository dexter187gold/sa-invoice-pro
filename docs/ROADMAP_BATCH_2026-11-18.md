# Roadmap batch — 18 Nov 2026

## Shipped this batch
- Owner Top 20 modules (payment webhook apply, POPIA export, recycle bin, SARS checklist, bank presets, portal magic link, service health)
- Settings: Backup (demo + POPIA + bin), Security (device seats), Ops (health + webhook replay)
- Offline banner + last-sync helper
- Bulk WhatsApp remind helper
- Plan device matrix Solo 1 / Shop 3 / Multi 8
- Licence server revoke consistency (prior commit)

## Still open
- Play Store listing process
- Windows Authenticode certificate
- Job photo attachments in OPFS
- Server-side Paystack ITN auto-push into desk (client replay exists)

## Suggested next batch
1. Wire `sarsTaxInvoiceChecklist` into InvoiceEdit before PDF
2. Wire `guessBankPreset` into BankImport header mapping UI
3. Soft-delete on Clients/Invoices list delete buttons
4. Job photo capture → OPFS
5. CI smoke for new Settings Ops buttons
