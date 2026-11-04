# SA Invoice Pro — Owner roadmap

**Ship:** **6.52.0** · **Weighted readiness ≈ 96.5%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / CI | **97%** |
| P3 Money loop | **90%** |
| P4 Client portal | **90%** |
| P7 WhatsApp | **96%** |
| P8 License / monetisation | **88%** |
| Docs / IT templates | **94%** |

### Mode
**Paystack test keys** until live keys arrive. Full Pay Now path is wired; point env at `pk_test_` / `sk_test_`.

### 6.52.0 done
- Portal approve-quote polish: optional decline reason, accept toast, jump to Invoices when balance open
- Chase messages: optional portal / pay-online line
- Version aligned (package / config / version.json)

### 6.51.0 done — Professional Pay Now foundation
- Server payments store + init / verify / webhook
- Portal Pay Now button + Inline + thank-you

### Next planned (order)
1. Bank CSV match UX depth (invoice suggestion on credits)
2. Collections chase UI polish on desk
3. Playwright coverage for portal pay + quote decision
4. Seat multi-user + white-label CSS pilot

### Owner env (test)
```
PAYSTACK_PUBLIC_KEY=pk_test_…
PAYSTACK_SECRET_KEY=sk_test_…
```
Webhook (when testing webhooks): `https://saip-sync.onrender.com/api/portal/pay/webhook`
