/** Consulting / Professional services — SA SME presets (ZAR, indicative). */

export const CONSULTING_ACCOUNT_TYPES = [
  'Retainer monthly',
  'Project fixed fee',
  'Time & materials',
  'Net 7',
  'Net 30',
  '50% deposit + balance',
]

export const CONSULTING_SERVICE_PRESETS = [
  { name: 'Discovery / scoping workshop (half day)', price: 3500, category: 'Engagement', sku: 'CON-SCO-HD', tags: ['consulting'] },
  { name: 'Consulting — per hour', price: 850, category: 'Time', sku: 'CON-HR-1', tags: ['consulting'] },
  { name: 'Consulting — half day', price: 3200, category: 'Time', sku: 'CON-HD', tags: ['consulting'] },
  { name: 'Consulting — full day', price: 5500, category: 'Time', sku: 'CON-FD', tags: ['consulting'] },
  { name: 'Monthly retainer (standard)', price: 8500, category: 'Retainer', sku: 'CON-RET-M', tags: ['consulting'] },
  { name: 'Report / deliverable write-up', price: 2500, category: 'Deliverable', sku: 'CON-RPT', tags: ['consulting'] },
  { name: 'Presentation to stakeholders', price: 1800, category: 'Deliverable', sku: 'CON-PRES', tags: ['consulting'] },
  { name: 'Travel / out-of-town (day)', price: 1200, category: 'Expenses', sku: 'CON-TRV', tags: ['consulting'] },
]

export const CONSULTING_PRODUCT_PRESETS = [
  { name: 'Licensed tool / template pack (pass-through)', price: 0, category: 'Tools', sku: 'CON-TOOL-0', tags: ['consulting'] },
  { name: 'Printed report set', price: 150, category: 'Materials', sku: 'CON-PRINT', tags: ['consulting'] },
]

export const CONSULTING_DOCUMENT_STUBS = [
  {
    id: 'consulting_sow',
    title: 'Statement of work / engagement letter',
    purpose: 'Define scope, deliverables, fees and acceptance for a professional engagement.',
    scope: 'Objectives, out-of-scope, timeline, fees, change control, client responsibilities.',
  },
  {
    id: 'consulting_status',
    title: 'Engagement status / progress note',
    purpose: 'Update the client on progress, risks and next steps.',
    scope: 'Period covered, work completed, blockers, decisions needed, next milestones.',
  },
]
