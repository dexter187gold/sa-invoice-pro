/** Consistent field metadata for professional forms */
export const CLIENT_FIELDS = [
  { key: 'name', label: 'Client / contact name', required: true, help: 'Legal or trading name shown on invoices' },
  { key: 'company', label: 'Company / organisation', required: false, help: 'Optional company name' },
  { key: 'email', label: 'Email', required: false, type: 'email', help: 'For statements and PDF delivery' },
  { key: 'phone', label: 'Mobile (WhatsApp)', required: false, help: 'SA format 082… or 2782… — used by AutoResponder' },
  { key: 'vatNumber', label: 'VAT number', required: false, help: 'If VAT-registered (e.g. 4xxxxxxxxx)' },
  { key: 'address', label: 'Billing address', required: false, help: 'Street, suburb, city, postal code' },
  { key: 'notes', label: 'Internal notes', required: false, help: 'Not printed on invoices unless enabled' },
]

export const INVOICE_FIELDS = [
  { key: 'number', label: 'Invoice number', required: true, help: 'Auto-generated if left blank' },
  { key: 'date', label: 'Invoice date', required: true, type: 'date' },
  { key: 'dueDate', label: 'Due date', required: true, type: 'date', help: 'Payment due by this date' },
  { key: 'reference', label: 'PO / reference', required: false, help: 'Customer purchase order or job ref' },
  { key: 'notes', label: 'Notes on invoice', required: false, help: 'Visible to the client on the PDF' },
  { key: 'terms', label: 'Payment terms', required: false, help: 'e.g. 30 days, EFT only' },
]
