/**
 * SARS tax-invoice field checklist (VAT Act guidance for SA tax invoices).
 */
export function sarsTaxInvoiceChecklist(invoice = {}, company = {}, client = {}) {
  const vatOn = invoice.vatEnabled != null
    ? !!invoice.vatEnabled
    : Number(invoice.vatAmount || 0) > 0 || !!company.vatNumber
  const checks = [
    { id: 'supplier_name', label: 'Supplier full name', ok: !!String(company.name || '').trim(), required: true },
    { id: 'supplier_address', label: 'Supplier address', ok: !!String(company.address || '').trim(), required: true },
    { id: 'supplier_vat', label: 'Supplier VAT number (if VAT vendor)', ok: !vatOn || !!String(company.vatNumber || '').trim(), required: vatOn },
    { id: 'invoice_number', label: 'Unique invoice number', ok: !!String(invoice.number || '').trim(), required: true },
    { id: 'invoice_date', label: 'Tax invoice date', ok: !!String(invoice.date || '').trim(), required: true },
    { id: 'recipient_name', label: 'Recipient name', ok: !!String(client.name || '').trim(), required: true },
    { id: 'recipient_address', label: 'Recipient address (recommended)', ok: !!String(client.address || '').trim(), required: false },
    { id: 'recipient_vat', label: 'Recipient VAT (B2B ≥ R5 000 recommended)', ok: Number(invoice.total || 0) < 5000 || !!String(client.vatNumber || '').trim(), required: false },
    { id: 'description', label: 'Description of goods/services', ok: Array.isArray(invoice.lines) && invoice.lines.some((l) => String(l.description || '').trim()), required: true },
    { id: 'quantity', label: 'Quantity or extent of supply', ok: Array.isArray(invoice.lines) && invoice.lines.every((l) => Number(l.qty) > 0), required: true },
    { id: 'price', label: 'Price / consideration', ok: Number(invoice.total || 0) > 0 || (invoice.lines || []).length > 0, required: true },
    { id: 'vat_amount', label: 'VAT amount shown when charging VAT', ok: !vatOn || Number(invoice.vatAmount || 0) > 0 || Number(invoice.vat || 0) > 0, required: vatOn },
    { id: 'tax_invoice_title', label: 'Document titled Tax Invoice when VAT charged', ok: true, required: vatOn, note: 'PDF uses TAX INVOICE when VAT is on' },
  ]
  const required = checks.filter((c) => c.required)
  const failed = required.filter((c) => !c.ok)
  return {
    vatOn,
    checks,
    ok: failed.length === 0,
    failed,
    score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100),
  }
}

export function formatChecklistMessage(result) {
  if (result.ok) return `SARS checklist OK (${result.score}%)`
  return `Missing tax-invoice fields: ${result.failed.map((f) => f.label).join('; ')}`
}
