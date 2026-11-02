# SA Invoice Pro — SME business-type module roadmap

**Base:** Core desk — **DONE**  
**Design system:** Sniper + per-type accent — **DONE**  
**Installable PWA** — **DONE**

| Status | Meaning |
|--------|---------|
| **DONE** | Compiled module usable |
| **ACTIVE** | Currently building |
| **NEXT** | Queued |
| **PLANNED** | Roadmapped |
| **CORE-ONLY** | Core desk only |

## Scoreboard

| # | Business type | Module | Status | Notes |
|---|---------------|--------|--------|-------|
| 1 | IT / MSP / Electronics | `it` | **DONE** | 64 docs, jobs, tech diagnose, presets |
| 2 | Retail / POS / Shop | `retail` | **DONE** | Product/service pack, retail docs, Products install |
| 3 | Trades / Construction | `trades` | **ACTIVE** | Call-out/labour/materials catalog started |
| 4 | Automotive | `automotive` | **NEXT** | |
| 5–19 | Other verticals | — | **PLANNED** | See full list in repo history |
| 20 | Other / General | `other` | **CORE-ONLY** | |

**Done:** 2 / 20 (+ core) · **Active:** Trades · **Next:** Automotive

## Cadence

1. One vertical at a time.  
2. Catalog → docs → Products install → mark DONE.  
3. Shared UI only; accent + catalogs differ.

## Retail — DONE

- [x] Type + accent + shop nav  
- [x] `retailCatalog.js`  
- [x] Documents templates  
- [x] Products “Install Retail pack”  
- [x] `status: stable` v1.0.0

## Trades — ACTIVE

- [x] `tradesCatalog.js` presets  
- [x] Module registered active  
- [ ] Products “Install Trades pack” on deploy  
- [ ] Trades docs in Documents UI  
- [ ] Mark stable
