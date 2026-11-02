/** Trades / Construction — SA SME presets (ZAR, indicative). */

export const TRADES_ACCOUNT_TYPES = [
  'COD / on completion',
  'Deposit + balance',
  'Net 7',
  'Net 30',
  'Progress claim',
  'Insurance / warranty work',
]

export const TRADES_SERVICE_PRESETS = [
  { name: 'Call-out / assessment (metro)', price: 450, category: 'Call-out', sku: 'TRD-CALL', tags: ['trades'] },
  { name: 'Labour — per hour', price: 350, category: 'Labour', sku: 'TRD-LAB-1H', tags: ['trades'] },
  { name: 'Labour — half day', price: 1400, category: 'Labour', sku: 'TRD-LAB-HD', tags: ['trades'] },
  { name: 'Labour — full day', price: 2500, category: 'Labour', sku: 'TRD-LAB-FD', tags: ['trades'] },
  { name: 'After-hours / weekend surcharge', price: 250, category: 'Call-out', sku: 'TRD-AH', tags: ['trades'] },
  { name: 'Materials handling / consumables', price: 150, category: 'Materials', sku: 'TRD-MAT-C', tags: ['trades'] },
  { name: 'Certificate of compliance admin', price: 350, category: 'Compliance', sku: 'TRD-COC', tags: ['trades'] },
]

export const TRADES_PRODUCT_PRESETS = [
  { name: 'Materials — as quoted (pass-through)', price: 0, category: 'Materials', sku: 'TRD-MAT-0', tags: ['trades'] },
  { name: 'Cable / conduit (per unit)', price: 25, category: 'Materials', sku: 'TRD-CAB-1', tags: ['trades'] },
  { name: 'Fitting / fixture (standard)', price: 120, category: 'Materials', sku: 'TRD-FIT-1', tags: ['trades'] },
]

export const TRADES_DOCUMENT_STUBS = [
  {
    id: 'trades_site_instruction',
    title: 'Site instruction / variation',
    purpose: 'Record client-approved change to scope on site.',
    scope: 'Original quote/job ref, change description, cost impact, approval signature.',
  },
  {
    id: 'trades_completion',
    title: 'Practical completion note',
    purpose: 'Confirm work completed and any snags remaining.',
    scope: 'Site address, work summary, snag list, client acknowledgement.',
  },
]
