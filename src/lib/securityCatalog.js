/** Security / Guarding - SA SME presets (ZAR, indicative). */

export const SEC_ACCOUNT_TYPES = ['Monthly contract', 'Event', 'Net 7', 'Net 30', 'Cash']

export const SEC_SERVICE_PRESETS = [
  { name: 'Static guard (12h shift)', price: 980, category: 'Guarding', sku: 'SEC-G12', tags: ['security'] },
  { name: 'Static guard (24h site/day)', price: 1850, category: 'Guarding', sku: 'SEC-G24', tags: ['security'] },
  { name: 'Event security (per officer)', price: 650, category: 'Events', sku: 'SEC-EVT', tags: ['security'] },
  { name: 'Armed response signup admin', price: 350, category: 'Response', sku: 'SEC-AR', tags: ['security'] },
  { name: 'Risk assessment', price: 1500, category: 'Advisory', sku: 'SEC-RISK', tags: ['security'] },
]

export const SEC_PRODUCT_PRESETS = [
  { name: 'Access card / tag', price: 95, category: 'Access', sku: 'SEC-TAG', tags: ['security'] },
]

export const SEC_DOCUMENT_STUBS = [
  { id: 'sec_post_orders', title: 'Post orders / site instructions', purpose: 'Define duties for a site or post.', scope: 'Hours, patrols, contacts, escalation.' },
  { id: 'sec_occurrence', title: 'Occurrence book extract', purpose: 'Record incidents and actions.', scope: 'Time, event, action, supervisor.' },
  { id: 'sec_contract', title: 'Guarding service schedule', purpose: 'Schedule for contracted hours.', scope: 'Posts, shifts, rates, start date.' },
  { id: 'sec_vetting', title: 'Officer deployment note', purpose: 'Record who is deployed where.', scope: 'Names, PSIRA refs, site, shift.' },
  { id: 'sec_incident', title: 'Security incident report', purpose: 'Formal incident report for client.', scope: 'What, when, injuries, police case, follow-up.' },
  { id: 'sec_invoice_hours', title: 'Hours confirmation for billing', purpose: 'Confirm billable hours.', scope: 'Site, shifts, totals.' },
]
