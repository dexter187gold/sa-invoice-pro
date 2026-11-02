/**
 * Retail / POS / Shop — SA SME presets (ZAR, indicative).
 */

export const RETAIL_ACCOUNT_TYPES = [
  'Walk-in / cash',
  'Card / speedpoint',
  'EFT account',
  'COD Account',
  'Net 7',
  'Net 30',
  'Staff purchase',
  'Wholesale',
]

export const RETAIL_PRODUCT_PRESETS = [
  { name: 'General merchandise (unit)', price: 50, category: 'General', sku: 'RTL-GEN-1', tags: ['retail'] },
  { name: 'Cool drink / beverage', price: 18, category: 'FMCG', sku: 'RTL-BEV-1', tags: ['retail', 'fmcg'] },
  { name: 'Snack / confectionery', price: 15, category: 'FMCG', sku: 'RTL-SNK-1', tags: ['retail'] },
  { name: 'Airtime / data voucher (pass-through)', price: 0, category: 'Voucher', sku: 'RTL-AIR-0', tags: ['retail', 'voucher'] },
  { name: 'Phone accessory — cable', price: 120, category: 'Accessories', sku: 'RTL-CAB-1', tags: ['retail'] },
  { name: 'Phone accessory — cover', price: 150, category: 'Accessories', sku: 'RTL-COV-1', tags: ['retail'] },
  { name: 'Stationery pack', price: 45, category: 'Stationery', sku: 'RTL-STA-1', tags: ['retail'] },
  { name: 'Cleaning product (unit)', price: 35, category: 'Household', sku: 'RTL-CLN-1', tags: ['retail'] },
  { name: 'Bagged dry goods (unit)', price: 40, category: 'Grocery', sku: 'RTL-DRY-1', tags: ['retail'] },
  { name: 'Gift / novelty item', price: 99, category: 'Gifts', sku: 'RTL-GFT-1', tags: ['retail'] },
]

export const RETAIL_SERVICE_PRESETS = [
  { name: 'Gift wrapping', price: 25, category: 'Service', sku: 'RTL-SVC-WRAP', tags: ['retail'] },
  { name: 'Local delivery (same suburb)', price: 50, category: 'Service', sku: 'RTL-SVC-DEL', tags: ['retail'] },
  { name: 'Lay-bye admin fee', price: 30, category: 'Service', sku: 'RTL-SVC-LAY', tags: ['retail'] },
  { name: 'Price check / stock query (no charge)', price: 0, category: 'Service', sku: 'RTL-SVC-QRY', tags: ['retail'] },
]

export const RETAIL_DOCUMENT_STUBS = [
  {
    id: 'retail_return',
    title: 'Goods return / exchange note',
    purpose: 'Record returned or exchanged goods with reason and refund method.',
    scope: 'Original invoice/till ref, items, condition, refund/exchange, staff and customer sign-off.',
  },
  {
    id: 'retail_till_variance',
    title: 'Till variance report',
    purpose: 'Explain cash-up difference at end of shift.',
    scope: 'Expected vs counted, possible causes, supervisor review.',
  },
  {
    id: 'retail_supplier_po',
    title: 'Supplier order summary',
    purpose: 'Simple purchase order summary to a supplier.',
    scope: 'Supplier, lines, quantities, needed-by date, delivery address.',
  },
]

export const RETAIL_DOCUMENT_TEMPLATES = RETAIL_DOCUMENT_STUBS.map((stub) => ({
  id: stub.id,
  title: stub.title,
  category: 'Retail',
  categoryLabel: 'Retail & shop',
  purpose: stub.purpose,
  scope: stub.scope,
  tags: ['retail', 'shop', ...(stub.title || '').toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 3).slice(0, 4)],
  sections: [
    { heading: '1. Document control', body: `Title: ${stub.title}\nVersion: 1.0\nStore / till: ____________________\nDate: __________\nStaff: ____________________` },
    { heading: '2. Purpose', body: stub.purpose },
    { heading: '3. Scope', body: stub.scope },
    { heading: '4. Details', body: 'Record line items, quantities, amounts, original invoice/till reference, and any serial numbers. Do not store full card numbers.' },
    { heading: '5. Outcome', body: 'Refund / exchange / order status: ____________________\nAmount: ____________________\nMethod: Cash / Card / EFT / Store credit' },
    { heading: '6. Sign-off', body: 'Staff: ____________________  Date: __________\nCustomer (if applicable): ____________________  Date: __________\nSupervisor: ____________________  Date: __________' },
  ],
}))
