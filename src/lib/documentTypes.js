/** Professional document type registry — Q1–Q5 Pro Studio */
export const DOCUMENT_TYPES = [
  { id: 'invoice', label: 'Tax Invoice', category: 'billing', icon: '📄', fields: ['client', 'lines', 'vat', 'due'], actions: ['pdf', 'whatsapp', 'email', 'duplicate'] },
  { id: 'quote', label: 'Quotation', category: 'billing', icon: '🧾', fields: ['client', 'lines', 'validity'], actions: ['pdf', 'whatsapp', 'convert_invoice'] },
  { id: 'proforma', label: 'Proforma Invoice', category: 'billing', icon: '📑', fields: ['client', 'lines', 'vat'], actions: ['pdf', 'whatsapp'] },
  { id: 'credit_note', label: 'Credit Note', category: 'billing', icon: '↩️', fields: ['client', 'lines', 'invoice_ref'], actions: ['pdf'] },
  { id: 'statement', label: 'Account Statement', category: 'billing', icon: '📊', fields: ['client', 'period', 'ledger'], actions: ['pdf', 'whatsapp', 'email'] },
  { id: 'receipt', label: 'Payment Receipt', category: 'billing', icon: '✅', fields: ['client', 'amount', 'method', 'invoice_ref'], actions: ['pdf', 'whatsapp'] },
  { id: 'purchase_order', label: 'Purchase Order', category: 'billing', icon: '🛒', fields: ['supplier', 'lines', 'delivery'], actions: ['pdf'] },
  { id: 'payslip', label: 'Payslip', category: 'payroll', icon: '💰', fields: ['employee', 'period', 'earnings', 'deductions'], actions: ['pdf'] },
  { id: 'job_card', label: 'Job Card / Work Order', category: 'ops', icon: '🔧', fields: ['client', 'device', 'issue', 'status'], actions: ['status', 'whatsapp', 'pdf'] },
  { id: 'delivery', label: 'Delivery Note', category: 'ops', icon: '📦', fields: ['client', 'items', 'received_by'], actions: ['pdf'] },
  { id: 'timesheet', label: 'Timesheet', category: 'ops', icon: '⏱️', fields: ['employee', 'period', 'hours'], actions: ['pdf', 'csv'] },
  { id: 'warranty_claim', label: 'Warranty Claim', category: 'ops', icon: '🛡️', fields: ['client', 'device', 'fault', 'proof'], actions: ['pdf'] },
  { id: 'sla', label: 'Service Level Agreement', category: 'legal', icon: '📋', fields: ['client', 'scope', 'response_times'], actions: ['pdf'] },
  { id: 'nda', label: 'Non-Disclosure Agreement', category: 'legal', icon: '🔒', fields: ['party_a', 'party_b', 'term'], actions: ['pdf'] },
  { id: 'popia', label: 'POPIA Notice', category: 'legal', icon: '🛡️', fields: ['operator', 'purpose', 'rights'], actions: ['pdf'] },
  { id: 'engagement', label: 'Engagement Letter', category: 'legal', icon: '✍️', fields: ['client', 'scope', 'fees'], actions: ['pdf'] },
  { id: 'tax_cover', label: 'Tax Cover Letter', category: 'billing', icon: '✉️', fields: ['client', 'period', 'reference'], actions: ['pdf', 'email'] },
  { id: 'terms', label: 'Terms of Business', category: 'legal', icon: '📜', fields: ['company', 'payment', 'liability'], actions: ['pdf'] },
]

export const CATEGORY_LABELS = {
  billing: 'Billing & money',
  payroll: 'Payroll',
  ops: 'Operations',
  legal: 'Legal & compliance',
}

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

export function listDocumentActions(id) {
  return getDocumentType(id).actions || ['pdf']
}

export function searchDocumentTypes(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return DOCUMENT_TYPES
  return DOCUMENT_TYPES.filter(
    (d) =>
      d.id.includes(q) ||
      d.label.toLowerCase().includes(q) ||
      d.category.includes(q) ||
      (d.fields || []).some((f) => f.includes(q))
  )
}
