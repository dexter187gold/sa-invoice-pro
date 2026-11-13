# SA Invoice Pro — Owner roadmap

**Ship:** **6.64.0** · **Top-100 adjusted readiness ≈ 40% fully shipped + partials**

| Priority | Shipped | Partial | Open |
|----------|--------:|--------:|-----:|
| **P0** | 13/13 | 0 | **0** |
| **P1** | 23 | 3 | 11 |
| **P2** | 1 | 0 | 33 |
| **P3** | 0 | 0 | 17 |
| **Total** | **37** | **3** | **61** |

### Mode
Paystack **test keys** until live. Google GIS **ID-token only** (email/name/sub).

### Recent wave (v6.61 – v6.64)
- Overpayment cascade → same-client open invoices (oldest due) → unapplied credit
- Live Open AR / chase totals from payments (`invoiceOutstanding`)
- Clients **Outstanding** column
- Google Continue (GIS ID-token; no open mailbox access)
- Undo delete toast (actionLabel / 30s)
- Merge duplicate clients (reassign inv/quote/ticket/payment)
- Roadmap reconciled: bank import, ticket→invoice, WaChase, SyncHealth, tags, portal marked shipped

### Next batch (recommended)
1. Recurring auto-generate on schedule  
2. Last contact + next follow-up  
3. Job-card photo attachments  
4. VAT201 helper polish  
5. Company letterhead on PDFs  
6. Full workspace ZIP export  

### Remaining blockers
1. Live Paystack keys when issued  
2. Optional: sync white-label prefs to cloud  
3. Full inbound webhook → ticket + auto-suggest (needs Render webhook)
