/** Accounting / Bookkeeping - SA SME presets (ZAR, indicative). */

export const ACCOUNTING_ACCOUNT_TYPES = ['Retainer', 'Monthly package', 'Hourly', 'Net 7', 'Net 30']

export const ACCOUNTING_SERVICE_PRESETS = [
  { name: 'Bookkeeping - monthly package', price: 1850, category: 'Bookkeeping', sku: 'ACC-BK-M', tags: ['accounting'] },
  { name: 'Payroll run (per cycle)', price: 650, category: 'Payroll', sku: 'ACC-PAY', tags: ['accounting'] },
  { name: 'VAT return preparation', price: 950, category: 'Tax', sku: 'ACC-VAT', tags: ['accounting'] },
  { name: 'Annual financial statements (from)', price: 4500, category: 'Reporting', sku: 'ACC-AFS', tags: ['accounting'] },
  { name: 'Tax consultation (hour)', price: 1200, category: 'Advisory', sku: 'ACC-TAX', tags: ['accounting'] },
  { name: 'Company secretarial (from)', price: 750, category: 'Secretarial', sku: 'ACC-SEC', tags: ['accounting'] },
]

export const ACCOUNTING_PRODUCT_PRESETS = [
  { name: 'Software admin fee (month)', price: 150, category: 'Admin', sku: 'ACC-SW', tags: ['accounting'] },
]

export const ACCOUNTING_DOCUMENT_STUBS = [
  { id: 'acc_engagement', title: 'Letter of engagement', purpose: 'Confirm accounting scope and fees.', scope: 'Services, deadlines, client duties, fees, signatures.' },
  { id: 'acc_checklist', title: 'Month-end checklist', purpose: 'Track books close tasks.', scope: 'Bank rec, invoices, payroll, VAT, review.' },
  { id: 'acc_vat_pack', title: 'VAT pack cover note', purpose: 'Cover note for VAT submission pack.', scope: 'Period, outputs, inputs, payment/refund.' },
  { id: 'acc_payroll', title: 'Payroll summary note', purpose: 'Summarise payroll for the cycle.', scope: 'Headcount, gross, deductions, NET, EMP201 ref.' },
  { id: 'acc_afs', title: 'AFS delivery note', purpose: 'Hand over draft/final AFS.', scope: 'Entity, year-end, versions, outstanding items.' },
  { id: 'acc_status', title: 'Client status report', purpose: 'Update client on books and deadlines.', scope: 'Open items, risks, next deadlines.' },
]
