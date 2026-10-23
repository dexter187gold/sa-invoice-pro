# SA Invoice Pro — Top 100 suggestions (ranked)

Version roadmap companion for **v5.5+**. Priorities: **P0** ship soon · **P1** next · **P2** later · **P3** vision.

Built for SA field service: tax invoices, WhatsApp collections, job cards, multi-device cloud sync, VAT/SARS-friendly exports.

---

## A. Cash & collections (field service)

1. **P0** Duplicate invoice in one tap — **shipped**
2. **P0** Duplicate quote / rate card — **shipped**
3. **P0** Aging AR on Dashboard (0–30 / 31–60 / 61–90 / 90+) — **shipped**
4. **P0** Mark all open paid + copy receipt + reuse payment — **shipped**
5. **P1** Batch WhatsApp reminders for all overdue (queue + templates)
6. **P1** Partial payment % chips (25/50/75/100%) — **shipped**
7. **P1** Client statement PDF from Clients list — **exists**
8. **P1** Auto-flag invoices past due → overdue — **helper shipped**
9. **P2** Promise-to-pay notes + next chase date on invoice
10. **P2** Collection call log per client (outcome, who, when)

## B. Invoicing & quotes

11. **P0** Multiline line descriptions (Enter = new line) — **shipped**
12. **P0** Credit notes / negative invoices — **shipped (CN button)**
13. **P1** Recurring invoices (monthly retainers + auto-generate)
14. **P1** Invoice from ticket in one click (parts + labour)
15. **P1** Proforma vs tax invoice toggle
16. **P1** Deposit / progress billing (% of quote)
17. **P2** Multi-currency (USD/EUR + ZAR) with rate on day
18. **P2** Unit of measure library (hr, km, unit, licence)
19. **P2** Discount % or R amount per line + footer discount
20. **P3** E-invoicing / SARS eFiling export pack

## C. Clients & CRM

21. **P0** Top clients by cash-in on Home — **shipped**
22. **P1** Client outstanding balance on every card — **partial**
23. **P1** Client tags + filter (VIP, COD, account, risk)
24. **P1** Merge duplicate clients
25. **P1** Last contact date + next follow-up reminder
26. **P2** POPIA consent flag + data export pack
27. **P2** Client portal magic-link (view invoices / pay)
28. **P2** GPS / site address on job + map pin
29. **P3** Equipment register per client (serials, warranty)
30. **P3** AI suggest next service date from history

## D. Job cards & WhatsApp

31. **P1** Ticket → invoice with parts + labour lines
32. **P1** Photo attachments on job cards (before/after)
33. **P1** Technician assignment + simple workload view
34. **P1** SLA countdown badges — **helpers exist**
35. **P2** WhatsApp status templates (en route, on site, complete)
36. **P2** AutoResponder ingest polish (server WA flow)
37. **P2** Signature capture on job complete
38. **P2** Parts used → stock deduct
39. **P3** Live map of open jobs
40. **P3** Voice notes → ticket notes (speech-to-text)

## E. Payments & banking

41. **P0** Payment actions suite — **shipped**
42. **P1** Bank CSV import (FNB / Standard / Absa formats)
43. **P1** Match bank lines to open invoices (fuzzy amount + ref)
44. **P1** PayFast webhook auto-mark paid — **partial**
45. **P2** Ozow / Peach / SnapScan links on invoice PDF
46. **P2** Split payment methods on one invoice
47. **P2** Tip / gratuity line for on-site work
48. **P2** Debit-order mandate templates (PDF)
49. **P3** Instant EFT reconciliation API
50. **P3** USDT / crypto settlement (niche B2B)

## F. Accounting & SARS-friendly

51. **P1** VAT output / input summary for period — **Reports**
52. **P1** VAT201-style totals helper
53. **P1** Trial balance / aged debtors CSV export — **Reports**
54. **P2** Journal templates (salary, drawings, stock)
55. **P2** Fixed asset simple register
56. **P2** Year-end close checklist
57. **P2** Accountant read-only cloud role
58. **P3** Full double-entry GL
59. **P3** SARS API connectors
60. **P3** IFRS for SMEs starter pack

## G. Payroll & HR (ZA)

61. **P1** Payslip PDF improvements — **base exists**
62. **P1** UIF / PAYE estimate calculator
63. **P2** Leave balances (annual / sick)
64. **P2** IRP5 annual summary export
65. **P2** Employee documents store (ID, contract)
66. **P3** Full payroll engine + EMP201

## H. Reports & insights

67. **P0** Month revenue vs expenses on Home — **shipped**
68. **P0** Top clients by revenue — **shipped**
69. **P1** Product / service mix chart
70. **P1** Technician utilisation (hours billed vs available)
71. **P1** Quote win-rate (converted / sent)
72. **P2** Cohort retention (repeat clients)
73. **P2** Cash forecast 30 / 60 / 90 from due dates
74. **P3** Benchmark vs industry (anonymous)

## I. Cloud, backup, multi-device

75. **P0** Recovery codes (on-screen, no SMTP) — **shipped**
76. **P0** Guaranteed workspace sync (seed / restore / merge) — **shipped**
77. **P1** Sync health panel (last push / pull / queue depth)
78. **P1** Conflict resolution UI (server vs device)
79. **P1** Export full workspace ZIP (JSON + PDFs)
80. **P2** Team seats / multi-user roles (owner, tech, accounts)
81. **P2** Audit log of who changed what
82. **P3** End-to-end encrypted workspace blobs

## J. UX, mobile, speed

83. **P0** Command palette + Excel viewer route — **shipped**
84. **P1** Global search (invoices, clients, tickets, quotes) — **palette**
85. **P1** Undo last delete (5s toast with restore)
86. **P1** Offline queue indicator with count
87. **P2** Bottom nav for phone
88. **P2** Larger touch targets / field-tech mode
89. **P2** Print-friendly CSS for statements
90. **P3** PWA install prompt polish

## K. Docs, compliance, polish

91. **P1** POPIA privacy notice template — **docs**
92. **P1** Company letterhead on all PDFs
93. **P1** In-app changelog (this roadmap companion)
94. **P2** B-BBEE certificate attach
95. **P2** Tax clearance reminder (expiry)
96. **P3** Multi-language UI (Afrikaans / isiZulu)

## L. Platform & growth

97. **P2** Capacitor Android release cadence
98. **P2** Desktop (Tauri / Electron) shell
99. **P3** Public API for integrators
100. **P3** Marketplace of industry packs (PC repair, solar, plumbing, CCTV)

---

### Shipped in v5.4.0 – v5.5.0 wave

| Item | Status |
|------|--------|
| Recovery codes + cloud reset | Done |
| Excel / CSV viewer in-app | Done |
| Multiline descriptions on quotes & invoices | Done |
| Mark all open paid · copy receipt · reuse payment | Done |
| Partial % chips on Payments | Done |
| Duplicate invoice / quote (`documentActions`) | Done |
| Credit note (CN) from invoice | Done |
| Aging AR buckets (Dashboard + Reports) | Done |
| Month cash snapshot on Home | Done |
| Top clients by cash-in on Home | Done |
| Command palette (Excel, collect, aging) | Done |
| Flag overdue helper | Done |
| ROADMAP_100.md | Done |
| Version **5.5.0** | This release |

### Next recommended build (v5.6)

1. Bank CSV import + match to invoices
2. Recurring invoices
3. Ticket → invoice one-click
4. Sync health panel
5. Undo delete toast
6. Batch overdue WhatsApp queue
