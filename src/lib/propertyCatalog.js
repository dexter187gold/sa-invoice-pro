/** Property / Estate - SA SME presets (ZAR, indicative). */

export const PROP_ACCOUNT_TYPES = ['Tenant', 'Owner', 'Agent', 'Net 7', 'Debit order']

export const PROP_SERVICE_PRESETS = [
  { name: 'Rental admin (month)', price: 650, category: 'Admin', sku: 'PROP-ADM', tags: ['property'] },
  { name: 'Tenant placement', price: 3500, category: 'Letting', sku: 'PROP-PLC', tags: ['property'] },
  { name: 'Inspection - in/out', price: 850, category: 'Inspections', sku: 'PROP-INSP', tags: ['property'] },
  { name: 'Maintenance coordination', price: 450, category: 'Maintenance', sku: 'PROP-MNT', tags: ['property'] },
  { name: 'Sales commission support fee', price: 1500, category: 'Sales', sku: 'PROP-SALE', tags: ['property'] },
]

export const PROP_PRODUCT_PRESETS = [
  { name: 'Key / access fob', price: 120, category: 'Access', sku: 'PROP-KEY', tags: ['property'] },
]

export const PROP_DOCUMENT_STUBS = [
  { id: 'prop_lease_sum', title: 'Lease summary note', purpose: 'Summarise key lease terms for the file.', scope: 'Parties, rent, deposit, start/end, clauses.' },
  { id: 'prop_inspection', title: 'Property inspection report', purpose: 'Record condition at in/out inspection.', scope: 'Rooms, defects, photos ref, signatures.' },
  { id: 'prop_mandate', title: 'Mandate / instruction', purpose: 'Owner instruction to manage or sell.', scope: 'Property, authority, fees, period.' },
  { id: 'prop_notice', title: 'Tenant notice acknowledgement', purpose: 'Acknowledge notice to vacate or remedy.', scope: 'Dates, reason, next steps.' },
  { id: 'prop_statement', title: 'Owner statement support note', purpose: 'Support monthly owner statement.', scope: 'Rent collected, expenses, net.' },
  { id: 'prop_viewing', title: 'Viewing feedback note', purpose: 'Capture viewing outcomes.', scope: 'Prospect, comments, interest level.' },
]
