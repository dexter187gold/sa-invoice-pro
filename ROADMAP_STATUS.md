# SA Invoice Pro — Owner roadmap

**Ship:** **6.65.0** · **Top-100 adjusted readiness rising**

| Priority | Shipped | Partial | Open |
|----------|--------:|--------:|-----:|
| **P0** | 13/13 | 0 | **0** |
| **P1** | ~28 | ~2 | ~6 |
| **P2** | 1+ | 0 | rest |
| **P3** | 0 | 0 | 17 |

### Mode
Paystack **test keys** until live. Google GIS **ID-token only** (email/name/sub).

### v6.65 batch (next recommended)
1. **Recurring auto-generate** — runs due templates once per day on app open (`autoRunRecurringOncePerDay`)
2. **Last contact + follow-up** — Clients columns + Mark contacted / Set follow-up actions
3. **Job-card photos** — up to 6 compressed photos per ticket (camera/file)
4. **VAT201 helper** — period filter, output/input/net, CSV export on Reports
5. **Company letterhead on PDFs** — `drawCompanyLetterhead` on invoices + statements
6. **Workspace ZIP export** — Settings → Download workspace ZIP (manifest + data)

### Still open (high value)
- Recurring scheduled background beyond daily open (true cron)
- VAT201 polish with expense VAT flags in expense form
- Photo storage off-device (cloud blobs)
- Full letterhead templates per document type

### Remaining blockers
1. Live Paystack keys when issued  
2. Optional: sync white-label prefs to cloud  
3. Full inbound webhook → ticket + auto-suggest (needs Render webhook)
