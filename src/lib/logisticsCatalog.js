/** Logistics / Transport - SA SME presets (ZAR, indicative). */

export const LOGISTICS_ACCOUNT_TYPES = ['Cash on delivery', 'Account', 'Net 7', 'Net 30', 'Contract rate']

export const LOGISTICS_SERVICE_PRESETS = [
  { name: 'Local delivery (per trip)', price: 450, category: 'Delivery', sku: 'LOG-LOC', tags: ['logistics'] },
  { name: 'Long distance (per km)', price: 12, category: 'Haulage', sku: 'LOG-KM', tags: ['logistics'] },
  { name: 'Same-day courier', price: 350, category: 'Courier', sku: 'LOG-SD', tags: ['logistics'] },
  { name: 'Warehouse handling (hour)', price: 280, category: 'Warehouse', sku: 'LOG-WH', tags: ['logistics'] },
  { name: 'Waiting time (hour)', price: 220, category: 'Surcharge', sku: 'LOG-WAIT', tags: ['logistics'] },
]

export const LOGISTICS_PRODUCT_PRESETS = [
  { name: 'Packaging / wrapping', price: 45, category: 'Materials', sku: 'LOG-PACK', tags: ['logistics'] },
]

export const LOGISTICS_DOCUMENT_STUBS = [
  { id: 'log_pod', title: 'Proof of delivery', purpose: 'Confirm goods received by consignee.', scope: 'Consignee, items, condition, time, signature.' },
  { id: 'log_waybill', title: 'Waybill / consignment note', purpose: 'Track shipment details.', scope: 'Origin, destination, weight, vehicle, driver.' },
  { id: 'log_quote', title: 'Transport quote', purpose: 'Quote a trip or contract rate.', scope: 'Route, load, rate basis, validity.' },
  { id: 'log_incident', title: 'Damage / incident report', purpose: 'Record transit damage or delay.', scope: 'What happened, photos ref, claim next steps.' },
  { id: 'log_job', title: 'Driver job card', purpose: 'Assign and close a delivery job.', scope: 'Stops, times, fuel, exceptions.' },
  { id: 'log_invoice_schedule', title: 'Trip invoice schedule', purpose: 'List trips for billing.', scope: 'Dates, refs, amounts.' },
]
