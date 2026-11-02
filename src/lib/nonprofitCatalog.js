/** Non-profit / NPO - SA SME presets (ZAR, indicative). */

export const NPO_ACCOUNT_TYPES = ['Donor', 'Grant', 'Member', 'Net 30', 'Project']

export const NPO_SERVICE_PRESETS = [
  { name: 'Programme admin (month)', price: 2500, category: 'Admin', sku: 'NPO-ADM', tags: ['nonprofit'] },
  { name: 'Fundraising event support', price: 1500, category: 'Events', sku: 'NPO-EVT', tags: ['nonprofit'] },
  { name: 'Grant report preparation', price: 1800, category: 'Reporting', sku: 'NPO-GR', tags: ['nonprofit'] },
  { name: 'Beneficiary intake session', price: 350, category: 'Programmes', sku: 'NPO-INT', tags: ['nonprofit'] },
  { name: 'Training workshop (from)', price: 2200, category: 'Training', sku: 'NPO-TRN', tags: ['nonprofit'] },
]

export const NPO_PRODUCT_PRESETS = [
  { name: 'Donation receipt booklet fee', price: 50, category: 'Admin', sku: 'NPO-REC', tags: ['nonprofit'] },
]

export const NPO_DOCUMENT_STUBS = [
  { id: 'npo_donation', title: 'Donation acknowledgement', purpose: 'Thank and acknowledge a donation.', scope: 'Donor, amount/in-kind, project, Section 18A if applicable.' },
  { id: 'npo_grant', title: 'Grant progress note', purpose: 'Report progress against grant activities.', scope: 'Activities, spend, outcomes, next period.' },
  { id: 'npo_beneficiary', title: 'Beneficiary intake form', purpose: 'Register a beneficiary.', scope: 'Details, needs, consent, programme.' },
  { id: 'npo_event', title: 'Event run-sheet', purpose: 'Plan a community or fundraising event.', scope: 'Schedule, roles, budget, risks.' },
  { id: 'npo_volunteer', title: 'Volunteer agreement note', purpose: 'Record volunteer role and terms.', scope: 'Role, hours, code of conduct, contacts.' },
  { id: 'npo_board', title: 'Board pack cover note', purpose: 'Cover for board meeting pack.', scope: 'Agenda items, decisions needed, annexures.' },
]
