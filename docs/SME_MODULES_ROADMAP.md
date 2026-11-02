# SA Invoice Pro — SME business-type module roadmap

**Base:** Core desk (invoices, quotes, clients, payments, expenses, reports) — **DONE**  
**Design system:** Sniper theme + per-type accent / nav style — **DONE**  
**Installable PWA** — **DONE**

Progress is tracked per **vertical module pack** (catalogs, documents, nav emphasis, workflows).  
UI shell stays shared so types do not diverge.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **DONE** | Compiled module: catalogs + routes + features usable |
| **ACTIVE** | Currently building |
| **NEXT** | Queued after active |
| **PLANNED** | Roadmapped, not started |
| **CORE-ONLY** | Uses core desk only until a pack is built |

---

## Scoreboard

| # | Business type | Module id | Status | Notes |
|---|---------------|-----------|--------|-------|
| 1 | IT / MSP / Electronics | `it` | **DONE** | 64 doc templates, job cards, tech diagnose, service presets, intake |
| 2 | Retail / POS / Shop | `retail` | **ACTIVE** | Product presets, shop nav style, till-friendly flows |
| 3 | Trades / Construction | `trades` → jobs+field | **NEXT** | Job cards, call-outs, materials |
| 4 | Automotive / Workshop | `automotive` | **PLANNED** | Job cards + parts |
| 5 | Consulting / Professional | `consulting` | **PLANNED** | Time/retainer language, docs |
| 6 | Hospitality / Food | `hospitality` | **PLANNED** | Retail-like + event quotes |
| 7 | Medical / Clinic | `medical` | **PLANNED** | Appointments-as-jobs, privacy-aware docs |
| 8 | Legal / Attorneys | `legal` | **PLANNED** | Matters, trust-safe wording |
| 9 | Accounting / Bookkeeping | `accounting` | **PLANNED** | Client packs, EMP/VAT-oriented docs |
| 10 | Logistics / Courier | `logistics` | **PLANNED** | Field jobs, POD language |
| 11 | Beauty / Salon / Spa | `beauty` | **PLANNED** | Bookings-as-jobs, retail products |
| 12 | Agriculture / Farming | `agriculture` | **PLANNED** | Seasonal invoicing, farm clients |
| 13 | Education / Training | `education` | **PLANNED** | Courses, attendance docs |
| 14 | Manufacturing | `manufacturing` | **PLANNED** | BOMs light, job cards |
| 15 | Real estate / Property | `property` | **PLANNED** | Mandates, rental statements |
| 16 | Security / Guarding | `security` | **PLANNED** | Sites, shift job cards |
| 17 | Cleaning / Facilities | `cleaning` | **PLANNED** | Sites, recurring jobs |
| 18 | Marketing / Creative | `creative` | **PLANNED** | Projects, retainers |
| 19 | Non-profit / NGO / Church | `nonprofit` | **PLANNED** | Donor/receipt language |
| 20 | Other / General SME | `other` | **CORE-ONLY** | Core desk forever OK |

**Done:** 1 / 20 vertical packs (+ core)  
**Active:** Retail  
**Next:** Trades  

---

## Cadence (owner rule)

1. One vertical at a time.  
2. Ship: **catalog presets → document pack (if needed) → nav/copy polish → mark DONE**.  
3. Do not fork the whole UI per type — only accent, module flags, and catalogs.  
4. IT stays **frozen** unless bugs.

---

## Retail pack — acceptance (ACTIVE)

- [x] Business type registered (`retail`) with modules `core`, `retail`, `products`
- [x] Accent amber / nav style `shop`
- [x] Retail product & service presets catalog (`retailCatalog.js`)
- [ ] Optional retail-oriented document stubs wired into Documents UI
- [ ] Products page surfaces retail presets when type is retail
- [ ] Mark module `status: 'stable'` when above pass

---

## Trades pack — preview (NEXT)

- Job card defaults (call-out, materials, labour)
- Quote line helpers for materials + labour
- Field nav style already mapped

---

## How to update this file

When a pack ships, set its row to **DONE**, move **ACTIVE** to the next row, bump the scoreboard counts.
