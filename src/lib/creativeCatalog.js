/** Creative / Media - SA SME presets (ZAR, indicative). */

export const CREATIVE_ACCOUNT_TYPES = ['50% deposit', 'Milestone', 'Net 7', 'Net 14', 'Retainer']

export const CREATIVE_SERVICE_PRESETS = [
  { name: 'Brand / logo package (from)', price: 4500, category: 'Design', sku: 'CR-LOGO', tags: ['creative'] },
  { name: 'Social media pack (month)', price: 3500, category: 'Social', sku: 'CR-SOC', tags: ['creative'] },
  { name: 'Photography session (from)', price: 2800, category: 'Photo', sku: 'CR-PHO', tags: ['creative'] },
  { name: 'Video edit (from)', price: 3200, category: 'Video', sku: 'CR-VID', tags: ['creative'] },
  { name: 'Web page design (from)', price: 5500, category: 'Web', sku: 'CR-WEB', tags: ['creative'] },
]

export const CREATIVE_PRODUCT_PRESETS = [
  { name: 'Stock / license pass-through', price: 250, category: 'Licenses', sku: 'CR-LIC', tags: ['creative'] },
]

export const CREATIVE_DOCUMENT_STUBS = [
  { id: 'cr_brief', title: 'Creative brief', purpose: 'Capture goals, audience and deliverables.', scope: 'Objectives, brand notes, deadlines, budget.' },
  { id: 'cr_proposal', title: 'Creative proposal', purpose: 'Propose scope and investment.', scope: 'Deliverables, timeline, fees, revisions.' },
  { id: 'cr_usage', title: 'Usage / license note', purpose: 'Clarify IP and usage rights.', scope: 'What client may use, territory, duration.' },
  { id: 'cr_delivery', title: 'Asset delivery note', purpose: 'List files delivered.', scope: 'Formats, links, versions.' },
  { id: 'cr_revision', title: 'Revision request log', purpose: 'Track change requests.', scope: 'Request, round number, approval.' },
  { id: 'cr_invoice_milestone', title: 'Milestone billing note', purpose: 'Support milestone invoice.', scope: 'Phase completed, % due.' },
]
