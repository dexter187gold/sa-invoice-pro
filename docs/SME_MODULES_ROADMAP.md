# SME modules roadmap

**Updated:** 21 November 2026

All verticals (except bare “Other / General”) have **type-scoped install packs**, **catalog presets**, and **document stubs** (10-section style where applicable). IT keeps the full 64+ template library.

## Module registry status (`smeModuleScoreboard`)

| Module key | Status | Depth |
|------------|--------|--------|
| core | **stable** | Full desk (invoices, quotes, clients, payments, expenses, reports) |
| it | **stable** | Deep: jobs, diagnose, 64+ docs, device intake |
| retail | **stable** | Products, payments, retail presets + stubs |
| trades | **stable** | Jobs, materials, variation stubs |
| automotive | **stable** | Workshop jobs, parts, QC stubs |
| consulting | **stable** | Retainers, SOW, T&M |
| hospitality | **stable** | F&B / rooms / events stubs |
| health_beauty | **stable** | Salon / spa services + consent |
| medical | **stable** | Consults, procedures, certificates |
| legal | **stable** | Mandates, fee notes, retainers |
| agriculture | **stable** | Farm services + seasonal stubs |
| accounting | **stable** | Fee packs + compliance-oriented stubs |
| logistics | **stable** | Trips / POD-oriented jobs |
| education | **stable** | Courses / training packs |
| manufacturing | **stable** | Work orders / QC-lite |
| property | **stable** | Mandates / inspections |
| security | **stable** | Shifts / sites / incidents |
| cleaning | **stable** | Contracts / site cleans |
| creative | **stable** | Campaigns / briefs |
| nonprofit | **stable** | Donor / project docs |

**Score:** **20 / 20 module keys stable** in registry (including core + it).
**Business types in `businessTypes.js`:** 19 named verticals + general/other → **~95–100% type coverage** for install packs.

### Still lighter than IT (by design)
Non-IT verticals ship **presets + document stubs**, not a second 64-template studio. Deeper industry workflows (GPS check-in, barcode POS, EMP201 payroll files, etc.) remain on the post-beta mega roadmap.

### CORE-ONLY
**Other / General** — core desk only, no vertical pack.
