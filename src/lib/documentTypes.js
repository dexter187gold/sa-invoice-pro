/** Professional document type registry */
export const DOCUMENT_TYPES = [
  { id: 'invoice', label: 'Tax Invoice', category: 'billing', icon: '📄', fields: ['client', 'lines', 'vat', 'due'] },
  { id: 'quote', label: 'Quotation', category: 'billing', icon: '🧾', fields: ['client', 'lines', 'validity'] },
  { id: 'statement', label: 'Account Statement', category: 'billing', icon: '📊', fields: ['client', 'period', 'ledger'] },
  { id: 'payslip', label: 'Payslip', category: 'payroll', icon: '💰', fields: ['employee', 'period', 'earnings', 'deductions'] },
  { id: 'job_card', label: 'Job Card / Work Order', category: 'ops', icon: '🔧', fields: ['client', 'device', 'issue', 'status'] },
  { id: 'sla', label: 'Service Level Agreement', category: 'legal', icon: '📋', fields: ['client', 'scope', 'response_times'] },
  { id: 'nda', label: 'Non-Disclosure Agreement', category: 'legal', icon: '🔒', fields: ['party_a', 'party_b', 'term'] },
  { id: 'popia', label: 'POPIA Notice', category: 'legal', icon: '🛡️', fields: ['operator', 'purpose', 'rights'] },
  { id: 'engagement', label: 'Engagement Letter', category: 'legal', icon: '✍️', fields: ['client', 'scope', 'fees'] },
  { id: 'tax_cover', label: 'Tax Cover Letter', category: 'billing', icon: '✉️', fields: ['client', 'period', 'reference'] },
  { id: 'receipt', label: 'Payment Receipt', category: 'billing', icon: '✅', fields: ['client', 'amount', 'method', 'invoice_ref'] },
  { id: 'delivery', label: 'Delivery Note', category: 'ops', icon: '📦', fields: ['client', 'items', 'received_by'] },
]

export function getDocumentType(id) {
  return DOCUMENT_TYPES.find((d) => d.id === id) || DOCUMENT_TYPES[0]
}

export function documentTypesByCategory() {
  const map = {}
  for (const d of DOCUMENT_TYPES) {
    if (!map[d.category]) map[d.category] = []
    map[d.category].push(d)
  }
  return map
}
