# SA Invoice Pro — Owner roadmap

**Ship:** **6.73.0** · **Top-100 adjusted readiness rising**

| Priority | Shipped | Partial | Open |
|----------|--------:|--------:|-----:|
| **P0** | 13/13 | 0 | **0** |
| **P1** | ~28 | ~2 | ~6 |
| **P2** | 1+ | 0 | rest |
| **P3** | 0 | 0 | 17 |

### Mode
Paystack **test keys** until live. Google GIS **ID-token only** (email/name/sub).

### v6.73 batch (just shipped)
- Full keyword-aware inbound WhatsApp reply packs now live in suggestInboundReplies (status, parts, quote, payment, hours, common repairs, water, FRP, after-hours).
- Inbox paste-and-suggest is production-ready for real SA desk conversations.

### v6.71 batch (shipped)
- Expanded inbound WhatsApp desk reply packs further (parts delay, quote approve, photos, rush/same-day, trade-in, factory wipe, insurance, after-hours, review request, opt-out, collection time).

### Still open (high value)
- Recurring scheduled background beyond daily open (true cron)
- VAT201 polish with expense VAT flags in expense form
- Photo storage off-device (cloud blobs)
- Full letterhead templates per document type
- Full inbound webhook → ticket + auto-suggest (needs Render webhook)

### Remaining blockers
1. Live Paystack keys when issued  
2. Optional: sync white-label prefs to cloud  
3. Full inbound webhook → ticket + auto-suggest (needs Render webhook)
