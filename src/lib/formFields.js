/** Consistent field metadata for professional forms — Q3 */
export const CLIENT_FIELDS = [
  { key: 'name', label: 'Client / contact name', required: true, help: 'Legal or trading name shown on invoices' },
  { key: 'company', label: 'Company / organisation', required: false, help: 'Optional company name' },
  { key: 'email', label: 'Email', required: false, type: 'email', help: 'For statements and PDF delivery' },
  { key: 'phone', label: 'Mobile (WhatsApp)', required: false, help: 'SA format 082… or 2782… — used by AutoResponder' },
  { key: 'vatNumber', label: 'VAT number', required: false, help: 'If VAT-registered (e.g. 4xxxxxxxxx)' },
  { key: 'address', label: 'Billing address', required: false, help: 'Street, suburb, city, postal code' },
  { key: 'city', label: 'City', required: false, help: 'Town or city' },
  { key: 'postalCode', label: 'Postal code', required: false, help: '4-digit SA postal code' },
  { key: 'category', label: 'Category', required: false, help: 'Retail, corporate, walk-in, etc.' },
  { key: 'notes', label: 'Internal notes', required: false, help: 'Not printed on invoices unless enabled' },
]

export const INVOICE_FIELDS = [
  { key: 'number', label: 'Invoice number', required: true, help: 'Auto-generated if left blank' },
  { key: 'date', label: 'Invoice date', required: true, type: 'date' },
  { key: 'dueDate', label: 'Due date', required: true, type: 'date', help: 'Payment due by this date' },
  { key: 'reference', label: 'PO / reference', required: false, help: 'Customer purchase order or job ref' },
  { key: 'notes', label: 'Notes on invoice', required: false, help: 'Visible to the client on the PDF' },
  { key: 'terms', label: 'Payment terms', required: false, help: 'e.g. 30 days, EFT only' },
  { key: 'discount', label: 'Discount %', required: false, type: 'number', help: 'Optional whole-invoice discount' },
]

export const JOB_CARD_FIELDS = [
  { key: 'customer_name', label: 'Customer name', required: true },
  { key: 'customer_phone', label: 'Phone', required: true, help: 'WhatsApp-capable number' },
  { key: 'device', label: 'Device / asset', required: true, help: 'Laptop model, serial, plate, etc.' },
  { key: 'issue', label: 'Issue reported', required: true },
  { key: 'urgency', label: 'Urgency', required: false, help: 'normal | high | critical' },
  { key: 'diagnosis', label: 'Diagnosis', required: false },
  { key: 'status', label: 'Status', required: true, help: 'new | diagnosing | in_progress | ready | collected' },
]

export const PRODUCT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'sku', label: 'SKU / code', required: false },
  { key: 'price', label: 'Unit price (ex VAT)', required: true, type: 'number' },
  { key: 'vatInclusive', label: 'Price includes VAT', required: false, type: 'boolean' },
  { key: 'unit', label: 'Unit', required: false, help: 'ea, hour, kg…' },
  { key: 'stock', label: 'Stock on hand', required: false, type: 'number' },
]

export function fieldByKey(list, key) {
  return (list || []).find((f) => f.key === key) || null
}

export function requiredKeys(list) {
  return (list || []).filter((f) => f.required).map((f) => f.key)
}
