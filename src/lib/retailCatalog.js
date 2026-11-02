/**
 * Retail / POS / Shop — SA SME presets (ZAR, indicative).
 * Used when business type includes the retail module.
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
