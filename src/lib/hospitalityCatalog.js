/** Hospitality / Café / Guest house — SA SME presets (ZAR, indicative). */

export const HOSPITALITY_ACCOUNT_TYPES = [
  'Walk-in / cash',
  'Room account',
  'Corporate function',
  'Net 7',
  '50% deposit + balance',
]

export const HOSPITALITY_SERVICE_PRESETS = [
  { name: 'Breakfast (per person)', price: 120, category: 'F&B', sku: 'HOS-BF', tags: ['hospitality'] },
  { name: 'Lunch special (per person)', price: 95, category: 'F&B', sku: 'HOS-LN', tags: ['hospitality'] },
  { name: 'Dinner (per person)', price: 180, category: 'F&B', sku: 'HOS-DN', tags: ['hospitality'] },
  { name: 'Room night — standard', price: 850, category: 'Rooms', sku: 'HOS-RM-S', tags: ['hospitality'] },
  { name: 'Room night — family', price: 1250, category: 'Rooms', sku: 'HOS-RM-F', tags: ['hospitality'] },
  { name: 'Conference day rate (per person)', price: 450, category: 'Events', sku: 'HOS-CONF', tags: ['hospitality'] },
  { name: 'Function hire (half day)', price: 2500, category: 'Events', sku: 'HOS-FUNC-HD', tags: ['hospitality'] },
  { name: 'Catering — platter (serves 8–10)', price: 650, category: 'F&B', sku: 'HOS-PLAT', tags: ['hospitality'] },
]

export const HOSPITALITY_PRODUCT_PRESETS = [
  { name: 'Bottled water (still)', price: 18, category: 'Retail', sku: 'HOS-WAT', tags: ['hospitality'] },
  { name: 'Soft drink', price: 25, category: 'Retail', sku: 'HOS-SOFT', tags: ['hospitality'] },
  { name: 'House wine (glass)', price: 45, category: 'Bar', sku: 'HOS-WINE', tags: ['hospitality'] },
]

export const HOSPITALITY_DOCUMENT_STUBS = [
  {
    id: 'hospitality_booking',
    title: 'Booking / reservation confirmation',
    purpose: 'Confirm stay or function details with the guest or organiser.',
    scope: 'Dates, rooms/covers, rates, deposit, cancellation, special requests.',
  },
  {
    id: 'hospitality_function',
    title: 'Function / event order sheet',
    purpose: 'Capture menu, timing, AV and staffing for an event.',
    scope: 'Guest count, menu choices, timeline, contact, payment schedule.',
  },
]
