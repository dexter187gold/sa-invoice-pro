/** Automotive / Workshop — SA SME presets (ZAR, indicative). */

export const AUTO_ACCOUNT_TYPES = [
  'COD / collect',
  'Card / speedpoint',
  'EFT account',
  'Insurance claim',
  'Fleet account',
  'Net 7',
  'Net 30',
]

export const AUTO_SERVICE_PRESETS = [
  { name: 'Diagnostic / assessment', price: 350, category: 'Diagnostic', sku: 'AUTO-DIAG', tags: ['auto'] },
  { name: 'Labour — per hour', price: 450, category: 'Labour', sku: 'AUTO-LAB-1H', tags: ['auto'] },
  { name: 'Oil service (excl. parts)', price: 650, category: 'Service', sku: 'AUTO-OIL', tags: ['auto'] },
  { name: 'Brake inspection', price: 280, category: 'Service', sku: 'AUTO-BRK', tags: ['auto'] },
  { name: 'Tyre fitment (per tyre, excl. tyre)', price: 80, category: 'Tyres', sku: 'AUTO-TYR-F', tags: ['auto'] },
  { name: 'Wheel balance / alignment (axle)', price: 350, category: 'Tyres', sku: 'AUTO-ALIGN', tags: ['auto'] },
  { name: 'Call-out / recovery assist (metro)', price: 550, category: 'Call-out', sku: 'AUTO-CALL', tags: ['auto'] },
  { name: 'Roadworthy inspection assist', price: 400, category: 'Compliance', sku: 'AUTO-RWC', tags: ['auto'] },
]

export const AUTO_PRODUCT_PRESETS = [
  { name: 'Oil filter (standard)', price: 120, category: 'Parts', sku: 'AUTO-FLT-O', tags: ['auto'] },
  { name: 'Air filter (standard)', price: 180, category: 'Parts', sku: 'AUTO-FLT-A', tags: ['auto'] },
  { name: 'Brake pads (axle set — mid range)', price: 650, category: 'Parts', sku: 'AUTO-PAD', tags: ['auto'] },
  { name: 'Parts — as quoted (pass-through)', price: 0, category: 'Parts', sku: 'AUTO-PART-0', tags: ['auto'] },
  { name: 'Consumables / shop supplies', price: 75, category: 'Consumables', sku: 'AUTO-CON', tags: ['auto'] },
]

export const AUTO_DOCUMENT_STUBS = [
  {
    id: 'auto_job_card',
    title: 'Vehicle job card / authority to repair',
    purpose: 'Record vehicle details, reported fault and customer authority to diagnose or repair.',
    scope: 'Reg, make/model, odometer, keys, belongings, estimate limit, data consent.',
  },
  {
    id: 'auto_qc',
    title: 'Workshop QC / handover checklist',
    purpose: 'Confirm work tested before vehicle leaves the bay.',
    scope: 'Work done, road test, fluids, torque notes, customer collect sign-off.',
  },
]
