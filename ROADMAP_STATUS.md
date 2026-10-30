# SA Invoice Pro — Owner roadmap

**Ship:** **6.45.0** · **Weighted readiness ≈ 92%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / nav / CI | **95%** |
| P1 CRUD | 92% |
| P2 Money | **95%** |
| P3 Payroll | 88% |
| P4 Portal | **95%** |
| P5 Bank | 86% |
| P6 Branches | 78% |
| P7 WhatsApp | **82%** |
| P8 License/PayFast | 90% |
| P9 Brand / gestures | **85%** |
| P10 Scale | 35% |

### 6.45.0 done
- **Credit note modal** on Invoices list (CN button opens amount + reason dialog; uses `issueCreditNote`)
- Quotes: fixed broken `SA_CONFIG` import → `SYNC_API_URL` / `APP_LINKS` (portal Apply queue + Pull cloud decisions)
- Portal offline decision queue remains one-tap Apply

### 6.44.0 done
- Meta WhatsApp Cloud API + Tickets Send Cloud button
- Server WhatsApp proxy + webhook routes

### Next
1. Meta env on Render + webhook point
2. PayFast live ITN → auto seat activate
3. Incoming WA → Inbox threads
4. Branches stock transfer polish (P6)

See `docs/MEGA_ROADMAP_90.md`.
