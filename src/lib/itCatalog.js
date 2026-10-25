/**
 * SA IT / electronics repair service pack.
 * Pre-built catalog for workshops: PC, smartphone, bypass, onsite/remote/COD.
 */
export const ACCOUNT_TYPES = [
  'COD Account',
  'On-site (call-out)',
  'Remote support',
  'Workshop drop-off',
  'Monthly retainer',
  'Net 7',
  'Net 30',
  'Warranty / goodwill',
]

export const SUPPORT_TYPES = [
  { id: 'remote', label: 'Remote' },
  { id: 'onsite', label: 'On-site' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'collection', label: 'Collection / delivery' },
]

export const IT_SERVICE_PRESETS = [
  { name: 'Remote support — first hour', price: 350, category: 'Remote', sku: 'SRV-REM-1H', tags: ['remote', 'support'] },
  { name: 'Remote support — additional 30 min', price: 150, category: 'Remote', sku: 'SRV-REM-30', tags: ['remote'] },
  { name: 'On-site call-out (within metro)', price: 450, category: 'On-site', sku: 'SRV-OS-CALL', tags: ['onsite', 'cod'] },
  { name: 'On-site labour — per hour', price: 450, category: 'On-site', sku: 'SRV-OS-1H', tags: ['onsite'] },
  { name: 'After-hours / weekend surcharge', price: 200, category: 'On-site', sku: 'SRV-AH', tags: ['onsite', 'premium'] },
  { name: 'Workshop bench fee (diagnosis)', price: 250, category: 'Workshop', sku: 'SRV-WS-DIAG', tags: ['workshop'] },
  { name: 'Workshop labour — per hour', price: 400, category: 'Workshop', sku: 'SRV-WS-1H', tags: ['workshop'] },
  { name: 'Windows / OS install + drivers', price: 650, category: 'PC', sku: 'SRV-OS-INSTALL', tags: ['pc', 'laptop'] },
  { name: 'Data backup before format (up to 100GB)', price: 350, category: 'PC', sku: 'SRV-BACKUP', tags: ['pc', 'data'] },
  { name: 'Virus / malware cleanup', price: 450, category: 'PC', sku: 'SRV-MALWARE', tags: ['pc', 'security'] },
  { name: 'SSD upgrade labour (excl. drive)', price: 300, category: 'PC', sku: 'SRV-SSD-LAB', tags: ['pc', 'upgrade'] },
  { name: 'RAM upgrade labour (excl. modules)', price: 200, category: 'PC', sku: 'SRV-RAM-LAB', tags: ['pc'] },
  { name: 'Laptop screen replacement labour', price: 450, category: 'PC', sku: 'SRV-LCD-LAB', tags: ['laptop'] },
  { name: 'Laptop keyboard replacement labour', price: 350, category: 'PC', sku: 'SRV-KB-LAB', tags: ['laptop'] },
  { name: 'Thermal paste + clean (laptop/PC)', price: 400, category: 'PC', sku: 'SRV-THERMAL', tags: ['pc', 'laptop'] },
  { name: 'Network / Wi-Fi setup (small office)', price: 550, category: 'Network', sku: 'SRV-NET', tags: ['network'] },
  { name: 'Email / Microsoft 365 setup (per mailbox)', price: 250, category: 'Cloud', sku: 'SRV-M365', tags: ['cloud'] },
  { name: 'Phone screen assessment', price: 150, category: 'Mobile', sku: 'SRV-PH-ASSESS', tags: ['phone'] },
  { name: 'Smartphone screen replacement labour', price: 350, category: 'Mobile', sku: 'SRV-PH-LCD', tags: ['phone'] },
  { name: 'Battery replacement labour (phone)', price: 250, category: 'Mobile', sku: 'SRV-PH-BAT', tags: ['phone'] },
  { name: 'Charging port repair labour', price: 300, category: 'Mobile', sku: 'SRV-PH-PORT', tags: ['phone'] },
  { name: 'Water damage assessment + clean', price: 400, category: 'Mobile', sku: 'SRV-PH-WATER', tags: ['phone'] },
  { name: 'Software repair / flash (supported models)', price: 450, category: 'Mobile', sku: 'SRV-PH-FLASH', tags: ['phone', 'bypass'] },
  { name: 'FRP / account lock assist (legal owner only)', price: 550, category: 'Mobile', sku: 'SRV-PH-FRP', tags: ['phone', 'bypass'] },
  { name: 'iCloud / Google lock consult (proof of ownership required)', price: 300, category: 'Mobile', sku: 'SRV-PH-LOCK', tags: ['phone', 'bypass'] },
  { name: 'Tablet screen labour', price: 400, category: 'Mobile', sku: 'SRV-TAB-LCD', tags: ['tablet'] },
  { name: 'Electronics board-level diagnosis', price: 350, category: 'Electronics', sku: 'SRV-EE-DIAG', tags: ['electronics'] },
  { name: 'Micro-soldering (quoted after diagnosis)', price: 600, category: 'Electronics', sku: 'SRV-EE-SOLDER', tags: ['electronics'] },
  { name: 'Game console clean + thermal service', price: 450, category: 'Electronics', sku: 'SRV-CONSOLE', tags: ['electronics'] },
  { name: 'CCTV / DVR basic setup (up to 4 cameras)', price: 750, category: 'Security', sku: 'SRV-CCTV', tags: ['security'] },
  { name: 'Monthly IT retainer — starter (up to 5 endpoints)', price: 1200, category: 'Retainer', sku: 'SRV-RET-S', tags: ['retainer'] },
  { name: 'Monthly IT retainer — business (up to 15 endpoints)', price: 2800, category: 'Retainer', sku: 'SRV-RET-B', tags: ['retainer'] },
  { name: 'POPIA / backup policy consult (1 hr)', price: 650, category: 'Consult', sku: 'SRV-POPIA', tags: ['consult'] },
]

export const IT_PRODUCT_PRESETS = [
  { name: 'SSD 500GB SATA (retail)', price: 650, category: 'Storage', sku: 'PRD-SSD-500' },
  { name: 'SSD 1TB NVMe (retail)', price: 1100, category: 'Storage', sku: 'PRD-SSD-1T' },
  { name: 'RAM 8GB DDR4 SODIMM', price: 450, category: 'Memory', sku: 'PRD-RAM-8' },
  { name: 'RAM 16GB DDR4 SODIMM', price: 750, category: 'Memory', sku: 'PRD-RAM-16' },
  { name: 'Laptop charger universal 90W', price: 350, category: 'Power', sku: 'PRD-CHG-90' },
  { name: 'Phone tempered glass', price: 80, category: 'Mobile parts', sku: 'PRD-TG' },
  { name: 'Phone case (generic)', price: 120, category: 'Mobile parts', sku: 'PRD-CASE' },
  { name: 'Thermal paste tube', price: 90, category: 'Consumable', sku: 'PRD-PASTE' },
  { name: 'SATA data cable', price: 40, category: 'Cable', sku: 'PRD-SATA' },
  { name: 'USB-C hub 5-in-1', price: 280, category: 'Accessory', sku: 'PRD-HUB' },
]

export function presetToServiceRow(p) {
  return {
    name: p.name,
    description: p.name,
    price: p.price,
    category: p.category || '',
    sku: p.sku || '',
    tags: p.tags || [],
    active: true,
    kind: 'service',
    createdAt: new Date().toISOString(),
  }
}

export function presetToProductRow(p) {
  return {
    name: p.name,
    description: p.name,
    price: p.price,
    category: p.category || '',
    sku: p.sku || '',
    active: true,
    kind: 'product',
    createdAt: new Date().toISOString(),
  }
}
