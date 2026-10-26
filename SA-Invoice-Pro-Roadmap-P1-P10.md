# SA Invoice Pro — Master Roadmap P1→P10
**Target:** ~10 000 capability units across user · app · server · client portal  
**Positioning:** The operating system for **Southern African IT / mobile repair / MSP benches** — not a generic invoice clone.

**Current baseline (shipped):** ~6.9.x · offline-first SPA · cloud sync · team link · portal · SMS proxy · device bind · roles · tickets/Kanban · themes · Google OAuth hooks · admin multi-tenant

**Effort model:** Each phase lists **themes**; each theme expands into many concrete updates (UI states, API fields, edge cases, tests, docs). Sum of themes ≈ **10 000 update-units** when fully executed.

---

## North-star differentiators (what makes it *not* Xero/Jobber/RepairDesk)

1. **Bench-native** — FRP, IMEI/serial, loaner phones, COD vs remote vs on-site baked into job cards  
2. **WhatsApp-first ops** — deep links open job cards; templates in ZA English/Afrikaans mix  
3. **Offline-first then cloud** — IndexedDB truth; cloud is restore, not a spinner wall  
4. **License + white-label for IT shops** — sell seats to other repair businesses  
5. **POPIA-aware defaults** — export, retention, consent flags  
6. **One profile, many devices** — Google/email + team link skips JSON backup after first sync  
7. **Pulse desk** — cash + SLA + collection ring in one glance  
8. **SA tax/invoice habits** — VAT 15%, quote→invoice, proforma culture  

---

## P1 — Foundation hardening (user · app · server)
**Goal:** Rock-solid auth, sync, no data loss. ~800 units

| # | Theme | User | App | Server |
|---|--------|------|-----|--------|
| 1.1 | Durable team invites | codes survive restart | list open invites | `team_invites.json` |
| 1.2 | Google OAuth production | one-tap sign-in | status-aware button | Render secrets + consent screen |
| 1.3 | Post-login restore always | zero backup ritual | `cloudBoot` + Sync Now | workspace pull merge rules |
| 1.4 | Conflict UX | choose local/cloud | merge preview | version vectors |
| 1.5 | Session hygiene | trusted devices list | revoke device | device API + heartbeat |
| 1.6 | Passwordless recovery | email magic optional | recovery code UX | rate limits |
| 1.7 | E2E critical paths | trust releases | Playwright login→invoice→job | health gates |
| 1.8 | Backup still optional | export JSON anytime | one-tap export | optional S3 backup |

---

## P2 — Desk & job excellence (unique repair DNA)
**Goal:** Best job card in SA IT/repair. ~1 200 units

| # | Theme |
|---|--------|
| 2.1 | Job types: COD · on-site · remote · walk-in · warranty · recall |
| 2.2 | Device passport: brand, model, IMEI, serial, passcode vault (encrypted), photos |
| 2.3 | FRP / activation lock / MDM checklists with pass/fail + tech sign-off |
| 2.4 | Loaner phone register + deposit on invoice |
| 2.5 | Parts reserved vs used vs RMA |
| 2.6 | Time clock → labour lines auto |
| 2.7 | SLA clocks (response / repair) with colour urgency |
| 2.8 | Kanban + timeline + customer-visible status map |
| 2.9 | WhatsApp: status templates + **open job** deep link |
| 2.10 | QC gate before “Ready for collection” |
| 2.11 | Multi-tech notes with @mention seats |
| 2.12 | Barcode/QR scan model + ticket print |

---

## P3 — Money loop (invoice → cash → bank)
**Goal:** Close the till without Excel. ~1 000 units

| # | Theme |
|---|--------|
| 3.1 | Quote → job → invoice chain with one-click convert |
| 3.2 | Partial payments, tips, COD flags |
| 3.3 | Bank CSV match (ZA banks) + apply |
| 3.4 | Overdue chase pack (WA + SMS + email) |
| 3.5 | Collection ring on Pulse |
| 3.6 | Deposit / retention / warranty hold |
| 3.7 | Multi-currency later; ZAR-first polish now |
| 3.8 | PDF themes per brand (white-label) |
| 3.9 | Signature + portal “approve quote” |
| 3.10 | Tax invoice compliance checklist (VAT fields) |

---

## P4 — Client experience (customer portal)
**Goal:** Clients feel a premium shop. ~900 units

| # | Theme |
|---|--------|
| 4.1 | Portal: invoices, balances, job status (read) |
| 4.2 | Approve quote / reject with reason |
| 4.3 | Pay link stub (PayFast / Ozow / Peach) |
| 4.4 | Upload photo of issue from phone |
| 4.5 | Magic link login (no password) |
| 4.6 | Branding: logo, colours, domain |
| 4.7 | POPIA consent capture |
| 4.8 | SMS/WA “portal ready” notifications |
| 4.9 | Public booking request → ticket draft |
| 4.10 | NPS after collection |

---

## P5 — Team, roles, multi-branch
**Goal:** Shop scales without chaos. ~1 000 units

| # | Theme |
|---|--------|
| 5.1 | Cloud team link (owner invite) |
| 5.2 | Persist invites + revoke |
| 5.3 | Hard route gates by seat role |
| 5.4 | Pin/switch seat on shared tablet |
| 5.5 | Branch workspaces (cloud isolation) |
| 5.6 | Inter-branch stock transfer |
| 5.7 | Manager dashboards per branch |
| 5.8 | Commission rules for techs |
| 5.9 | Audit log (who changed price/status) |
| 5.10 | API keys per integration |

---

## P6 — Communications stack
**Goal:** WhatsApp/SMS as first-class channels. ~800 units

| # | Theme |
|---|--------|
| 6.1 | SMS proxy production (AT / Clickatell) |
| 6.2 | WA Business API optional path |
| 6.3 | Template library (ZA tone) |
| 6.4 | Opt-out / quiet hours |
| 6.5 | Inbound WA → ticket create (webhook) |
| 6.6 | Outbox with retry + admin visibility |
| 6.7 | Call log note (manual) |
| 6.8 | Email send via Resend/Postmark |

---

## P7 — Intelligence & automation
**Goal:** Feels smart, not gimmicky. ~1 000 units

| # | Theme |
|---|--------|
| 7.1 | AI chat: “overdue this week”, “parts for iPhone 12 LCD” |
| 7.2 | Suggested labour time from history |
| 7.3 | Price book recommendations |
| 7.4 | Anomaly: discount spikes, void patterns |
| 7.5 | Forecast cash next 14 days |
| 7.6 | Auto-tag jobs (screen, battery, data) |
| 7.7 | Webhooks out (invoice.paid, job.ready) |
| 7.8 | Zapier/Make connector docs |
| 7.9 | Rules engine: if overdue >7d → WA chase |
| 7.10 | Local LLM optional for privacy shops |

---

## P8 — License, monetisation, white-label
**Goal:** Other IT companies buy SAIP. ~900 units

| # | Theme |
|---|--------|
| 8.1 | Tiers: Solo / Shop / Multi / Enterprise |
| 8.2 | Seat enforcement server-side |
| 8.3 | License server activation + device bind |
| 8.4 | White-label CSS + custom domain |
| 8.5 | Reseller admin (you sell seats) |
| 8.6 | In-app billing portal |
| 8.7 | Trial 14-day with watermark PDF option |
| 8.8 | Feature flags per tier |
| 8.9 | Marketplace listing kit |
| 8.10 | Partner referral codes |

---

## P9 — Platform quality (server · CI · security)
**Goal:** Sleep at night. ~1 200 units

| # | Theme |
|---|--------|
| 9.1 | Playwright expanded (invoice, job, team join) |
| 9.2 | Load test workspace push |
| 9.3 | Git durable store monitoring |
| 9.4 | Encrypted field store (passcodes) |
| 9.5 | POPIA data export / erase |
| 9.6 | CORS / CSP harden |
| 9.7 | Structured logs + error budgets |
| 9.8 | Staging environment parity |
| 9.9 | DB migration path (JSON → SQLite/Postgres) |
| 9.10 | Backup retention policy |

---

## P10 — Signature uniqueness (the “only SAIP has this” pack)
**Goal:** Uncopyable desk culture. ~1 200 units

| # | Theme | Why unique |
|---|--------|------------|
| 10.1 | **Lab brand mode** — premium SA identity without looking toy | Identity |
| 10.2 | **Collection ring** — who is waiting in-store now | Floor ops |
| 10.3 | **Bypass / research log** (access-controlled, not on customer PDF) | Repair reality |
| 10.4 | **Spaza-to-boardroom themes** — global + SA-inspired skins | Taste |
| 10.5 | **Job hologram card** — shareable status image for WA | Viral UX |
| 10.6 | **Tech rivalry board** (optional: jobs closed, CSAT) | Retention |
| 10.7 | **Load-shedding mode** — offline-first + queue SMS when grid returns | SA-only |
| 10.8 | **Municipal/business docs pack** — SLA, POPIA, tax letters | SA admin |
| 10.9 | **AR / intake experiments** (optional modules) | Future desk |
| 10.10 | **Portal language preference** (en / af / zu / xh progressive) | Inclusion |

---

## Cross-cutting “10k update” breakdown

| Layer | Approx units | Examples of atomic updates |
|-------|----------------|----------------------------|
| User-facing UI states | 2 500 | empty, loading, error, offline, permission denied per screen |
| Interactions | 2 000 | gestures, bulk actions, keyboard shortcuts, WA shares |
| Server endpoints & validation | 1 500 | every field, authz, rate limit, audit |
| Client portal | 1 000 | public pages, magic links, branding |
| Data model & migrations | 800 | indexes, merge, branch keys |
| Tests & CI | 700 | unit + e2e + smoke |
| Docs & license packaging | 500 | runbooks, reseller kit |
| Polish & a11y | 500 | contrast, touch targets, screen reader |
| Integrations | 500 | SMS, WA, PayFast, webhooks |
| **Total** | **~10 000** | |

---

## Suggested execution order (next 90 days)

| Sprint | Focus |
|--------|--------|
| Now | Google secrets on Render · invite persistence · cloud restore soak |
| +2 w | Job device passport + FRP checklist + WA deep link polish |
| +4 w | Portal approve-quote + PayFast stub |
| +6 w | Bank CSV + chase pack |
| +8 w | Postgres migration design · seat enforcement server-side |
| +10 w | AI desk assistant v1 · load-shedding mode |
| +12 w | White-label pilot with 1 partner shop |

---

## Success metrics

- Time-to-first-invoice (new shop) < 10 minutes  
- Restore on new phone without JSON > 95% success  
- Job → invoice conversion taps ≤ 2  
- Portal open rate from WA link  
- Paid licenses (other IT companies)  

---

## Document control

- Editable Markdown: `SA-Invoice-Pro-Roadmap-P1-P10.md`  
- Phase board in-app can mirror P1–P10 checkboxes  
- Revisit uniqueness pack (P10) every quarter — this is the moat  

*Execute in slices; measure; keep the bench feeling faster than the competition.*
