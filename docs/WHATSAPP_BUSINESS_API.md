# WhatsApp Business API — end-to-end plan (companies ↔ clients)

**Goal:** Official Meta Cloud API so the shop can message clients (job status, quotes, invoices) and receive replies into SA Invoice Pro — not only `wa.me` deep links.

---

## Architecture

```
Client WhatsApp  ↔  Meta Cloud API  ↔  Webhook (saip-sync or CF Worker)
                                              ↓
                                    SA Invoice Pro desk (Inbox / ticket thread)
```

| Direction | Mechanism |
|-----------|-----------|
| **Outbound** | Desk → `waBusiness.sendWhatsAppText` / template send → Graph API |
| **Inbound** | Meta webhook → verify signature → store message → Inbox / ticket comment |
| **Fallback** | If no token: open `wa.me` (current behaviour) |

---

## Prerequisites (you)

1. Meta Business Manager + **WhatsApp Business App** (you said you have this)
2. Create a **WhatsApp Business Platform** app → get:
   - App ID / App Secret
   - Permanent or long-lived **access token**
   - **Phone number ID**
   - **WABA ID**
3. Paste into **Dev portal → Secrets vault** (or Render env for server webhook)
4. Verify business / display name (Meta review)

---

## Phases

### Phase A — Outbound (this ship scaffold)
- [x] `src/lib/waBusiness.js` Cloud API text send + job status helper
- [x] Dev portal fields for Meta token / phone id
- [ ] Ticket UI button “Notify client (WhatsApp)” calling `notifyJobStatus`
- [ ] Invoice / quote chase via Cloud API when configured

### Phase B — Templates (24h window)
- Register templates in Meta (e.g. `job_ready`, `quote_sent`, `payment_reminder`)
- Map template names in desk Settings → WhatsApp
- Only utility/marketing templates outside the 24h customer-care window

### Phase C — Inbound webhook
- Endpoint: `POST https://saip-sync.onrender.com/api/wa/webhook` (or Worker)
- Verify `hub.challenge` on GET
- Validate `X-Hub-Signature-256` with App Secret
- Persist messages keyed by client phone → open/create ticket thread
- Desk **Inbox** shows unread WA messages

### Phase D — Two-way ops
- Reply from ticket = Cloud API send
- Media (photos of repairs) optional
- Opt-out / STOP handling (POPIA)

---

## Free-tier notes

- Meta conversation pricing applies after trial tiers change — monitor Business Manager
- Render free tier cold starts: webhook may need a warmer (cron ping) or move webhook to Cloudflare Worker

---

## Security

- Never commit access tokens
- Prefer server-side send for production volume (proxy via saip-sync)
- Client-side send is OK for alpha with your token on your device only
