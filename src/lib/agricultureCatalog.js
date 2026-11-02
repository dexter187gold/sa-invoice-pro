/** Agriculture / Farming - SA SME presets (ZAR, indicative). */

export const AGRI_ACCOUNT_TYPES = [
  'Cash / COD',
  'Net 7',
  'Net 30',
  'Seasonal account',
  'Co-op',
]

export const AGRI_SERVICE_PRESETS = [
  { name: 'On-farm consultation', price: 850, category: 'Advisory', sku: 'AG-CON', tags: ['agriculture'] },
  { name: 'Soil / crop assessment', price: 1200, category: 'Advisory', sku: 'AG-SOIL', tags: ['agriculture'] },
  { name: 'Livestock handling (day)', price: 1500, category: 'Livestock', sku: 'AG-LIVE', tags: ['agriculture'] },
  { name: 'Equipment hire (day)', price: 2200, category: 'Equipment', sku: 'AG-EQ', tags: ['agriculture'] },
  { name: 'Harvest support (day)', price: 2800, category: 'Labour', sku: 'AG-HARV', tags: ['agriculture'] },
]

export const AGRI_PRODUCT_PRESETS = [
  { name: 'Feed bag (unit)', price: 320, category: 'Inputs', sku: 'AG-FEET', tags: ['agriculture'] },
  { name: 'Seed pack (unit)', price: 180, category: 'Inputs', sku: 'AG-SEED', tags: ['agriculture'] },
]

export const AGRI_DOCUMENT_STUBS = [
  { id: 'agri_delivery', title: 'Produce delivery note', purpose: 'Record delivery of produce or inputs.', scope: 'Buyer, items, quantities, grade, vehicle, signatures.' },
  { id: 'agri_quote', title: 'Seasonal supply quote', purpose: 'Quote supply for a season or contract period.', scope: 'Volumes, pricing, delivery windows, payment terms.' },
  { id: 'agri_job', title: 'Farm work job card', purpose: 'Track on-farm work and materials used.', scope: 'Site, work done, labour hours, materials, sign-off.' },
  { id: 'agri_safety', title: 'Farm safety / induction note', purpose: 'Record visitor or contractor induction.', scope: 'Hazards, PPE, emergency contacts, acknowledgement.' },
  { id: 'agri_invoice_pack', title: 'Bulk invoice support schedule', purpose: 'Support schedule for bulk invoicing.', scope: 'Loads, dates, weights, rates.' },
  { id: 'agri_close', title: 'Season close-out note', purpose: 'Close seasonal engagement and balances.', scope: 'Volumes delivered, amounts paid, outstanding.' },
]
