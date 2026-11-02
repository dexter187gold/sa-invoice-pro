/** Legal / Attorneys - SA SME presets (ZAR, indicative). */

export const LEGAL_ACCOUNT_TYPES = [
  'Retainer',
  'Trust / deposit',
  'Net 7',
  'Net 30',
  'On account',
]

export const LEGAL_SERVICE_PRESETS = [
  { name: 'Consultation - first hour', price: 1800, category: 'Consult', sku: 'LEG-CON-1', tags: ['legal'] },
  { name: 'Consultation - follow-up (hour)', price: 1500, category: 'Consult', sku: 'LEG-CON-H', tags: ['legal'] },
  { name: 'Letter of demand', price: 950, category: 'Correspondence', sku: 'LEG-LOD', tags: ['legal'] },
  { name: 'Contract review (from)', price: 2500, category: 'Contracts', sku: 'LEG-REV', tags: ['legal'] },
  { name: 'Agreement drafting (from)', price: 4500, category: 'Contracts', sku: 'LEG-DFT', tags: ['legal'] },
  { name: 'Court appearance - unopposed (from)', price: 3500, category: 'Litigation', sku: 'LEG-CRT', tags: ['legal'] },
  { name: 'Conveyancing - transfer (from)', price: 12000, category: 'Conveyancing', sku: 'LEG-CNV', tags: ['legal'] },
  { name: 'Trust administration (hourly)', price: 1600, category: 'Estates', sku: 'LEG-TRU', tags: ['legal'] },
]

export const LEGAL_PRODUCT_PRESETS = [
  { name: 'Disbursement - courier', price: 120, category: 'Disbursements', sku: 'LEG-COU', tags: ['legal'] },
  { name: 'Disbursement - search fee', price: 350, category: 'Disbursements', sku: 'LEG-SRH', tags: ['legal'] },
]

export const LEGAL_DOCUMENT_STUBS = [
  {
    id: 'legal_engagement',
    title: 'Letter of engagement / mandate',
    purpose: 'Confirm scope of work, fees and authority to act.',
    scope: 'Client, matter description, fee basis, deposit, termination, signatures.',
  },
  {
    id: 'legal_fee_note',
    title: 'Fee note / pro-forma account',
    purpose: 'Itemise professional fees and disbursements for a matter.',
    scope: 'Matter reference, time entries or fixed fee, VAT, trust/deposit applied.',
  },
  {
    id: 'legal_status',
    title: 'Matter status report',
    purpose: 'Update the client on progress and next steps.',
    scope: 'Current status, outstanding items, risks, recommended actions.',
  },
]
