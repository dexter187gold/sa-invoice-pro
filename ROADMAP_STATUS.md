# SA Invoice Pro — Owner roadmap

**Ship:** **6.53.0** · **Weighted readiness ≈ 97%**

| P | Theme | % |
|---|--------|--:|
| P0 Stability / CI | **97%** |
| P3 Money loop | **92%** |
| P4 Client portal | **90%** |
| P7 WhatsApp | **97%** |
| P8 License / monetisation | **88%** |
| Docs / IT templates | **94%** |

### Mode
Paystack **test keys** until live. Chase + Pay Now path ready for desk use.

### 6.53.0 done — Collections chase UI
- Age filters: All / 7+ / 14+ / 30+ days
- Toggle: append portal / pay-online link on invoice chases
- Persisted last-chased log (`localStorage`)
- Pulse Home → Full queue + WhatsApp chase shortcuts
- Urgency styling for 14d+

### Recommended order (remaining)
1. ~~Chase UI~~ **done**
2. **Bank CSV** — suggest open invoices when a credit lands
3. Playwright smoke (portal quote + pay + chase)
4. Seat multi-user + white-label CSS pilot

### Owner env (test)
```
PAYSTACK_PUBLIC_KEY=pk_test_…
PAYSTACK_SECRET_KEY=sk_test_…
```
