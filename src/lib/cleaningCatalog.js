/** Cleaning / Hygiene - SA SME presets (ZAR, indicative). */

export const CLEAN_ACCOUNT_TYPES = ['Once-off', 'Weekly', 'Monthly contract', 'Net 7', 'Cash']

export const CLEAN_SERVICE_PRESETS = [
  { name: 'Domestic clean (standard)', price: 450, category: 'Domestic', sku: 'CLN-DOM', tags: ['cleaning'] },
  { name: 'Deep clean (from)', price: 1200, category: 'Deep', sku: 'CLN-DEEP', tags: ['cleaning'] },
  { name: 'Office clean (per visit)', price: 650, category: 'Commercial', sku: 'CLN-OFF', tags: ['cleaning'] },
  { name: 'Carpet / upholstery (from)', price: 350, category: 'Specialist', sku: 'CLN-CAR', tags: ['cleaning'] },
  { name: 'After-builders clean (from)', price: 1800, category: 'Specialist', sku: 'CLN-BLD', tags: ['cleaning'] },
]

export const CLEAN_PRODUCT_PRESETS = [
  { name: 'Consumables surcharge', price: 80, category: 'Consumables', sku: 'CLN-CON', tags: ['cleaning'] },
]

export const CLEAN_DOCUMENT_STUBS = [
  { id: 'cln_checklist', title: 'Cleaning checklist', purpose: 'Room-by-room tasks completed.', scope: 'Areas, tasks, chemicals used, sign-off.' },
  { id: 'cln_quote', title: 'Cleaning quote', purpose: 'Quote once-off or contract work.', scope: 'Scope, frequency, price, exclusions.' },
  { id: 'cln_job', title: 'Job card / site visit', purpose: 'Track a cleaning visit.', scope: 'Address, team, start/end, notes.' },
  { id: 'cln_satisfaction', title: 'Client satisfaction note', purpose: 'Capture client feedback after job.', scope: 'Rating, comments, rework if any.' },
  { id: 'cln_contract', title: 'Service schedule', purpose: 'Recurring service schedule.', scope: 'Days, times, scope, rate.' },
  { id: 'cln_keys', title: 'Key / access register', purpose: 'Log keys or codes held.', scope: 'Item, issued to, returned.' },
]
