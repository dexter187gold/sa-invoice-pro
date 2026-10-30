# SA Invoice Pro — Owner roadmap

**Ship:** **6.44.0** · **Weighted readiness ≈ 91%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / nav / CI | **95%** |
| P1 CRUD | 92% |
| P2 Money | **93%** |
| P3 Payroll | 88% |
| P4 Portal | 94% |
| P5 Bank | 86% |
| P6 Branches | 78% |
| P7 WhatsApp | **82%** |
| P8 License/PayFast | 90% |
| P9 Brand / gestures | **85%** |
| P10 Scale | 35% |

### 6.44.0 done
- **Meta WhatsApp Cloud API** (`src/lib/whatsapp.js`) — sendWhatsAppText, job status templates, credential detection from Dev Portal secrets
- **Server proxy** `POST /api/whatsapp/send` + webhook verify/ack (token stays on Render)
- Tickets: **Send Cloud** button next to wa.me (auto-fallback)
- Credit note modal already present; Invoices wired to issueCreditNote path
- Version files aligned (package / config / version.json / ROADMAP)

### 6.43.0 done
- Modal popups for catalog / employees / petty cash
- Owner radar on Products, Employees, Payroll, Reports, Bank, Documents, Recurring
- Invoices + Tickets radar restored

### Next
1. Deploy saip-sync with META_ACCESS_TOKEN + META_PHONE_NUMBER_ID + META_VERIFY_TOKEN
2. Point Meta webhook Callback URL at `https://saip-sync.onrender.com/api/whatsapp/webhook`
3. PayFast live ITN → auto seat activate
4. Portal Accept → desk live proof on free-tier Render
5. Incoming WA → Inbox thread (P7 remaining)

See `docs/MEGA_ROADMAP_90.md`.
