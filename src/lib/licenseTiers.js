/**
 * App license plans — aligned with license_plans.py / licence server.
 * Order: Trial · Solo · Shop · Multi · Lifetime · Enterprise
 */

export const PLAN_CODES = {
  T: 'trial', S: 'solo', P: 'shop', M: 'multi', L: 'lifetime', E: 'enterprise',
}

export const PLAN_ID_TO_CODE = {
  trial: 'T', solo: 'S', shop: 'P', multi: 'M', lifetime: 'L', enterprise: 'E',
}

export const GUIDE_PRICES = {
  solo: { annual: 1999, monthlyHint: 167 },
  shop: { annual: 4999, monthlyHint: 417 },
  multi: { annual: 11999, monthlyHint: 1000 },
  lifetime: { once: 14999 },
  enterprise: { once: 29999 },
}

export const TIERS = [
  {
    id: 'trial', code: 'T', name: 'Trial', priceHint: 'Free · 7 days',
    seats: 1, days: 7, purchasable: false,
    limits: ['Clients / invoices / quotes only', 'No team seats', 'No accounting modules'],
    features: ['Core billing workflow', 'Evaluate desk fit', 'Upgrade anytime'],
  },
  {
    id: 'solo', code: 'S', name: 'Solo', priceHint: 'R 1 999 / year · ~R 167/mo',
    seats: 1, days: 365, purchasable: true,
    limits: ['1 device seat', 'Single operator', 'No multi-branch'],
    features: ['Invoices, quotes, jobs', 'WhatsApp + client portal', 'Offline desk + cloud restore', 'IT service pack & themes'],
  },
  {
    id: 'shop', code: 'P', name: 'Shop', priceHint: 'R 4 999 / year · ~R 417/mo',
    seats: 5, days: 365, purchasable: true, recommended: true,
    limits: ['Up to 5 seats', 'One workshop location', 'No branch workspaces'],
    features: ['Everything in Solo', 'Team roles & audit log', 'Accounting, bank import, payroll tools', 'Bulk chase & recurring invoices', 'Priority support'],
  },
  {
    id: 'multi', code: 'M', name: 'Multi-branch', priceHint: 'R 11 999 / year · ~R 1 000/mo',
    seats: 25, days: 365, purchasable: true,
    limits: ['Up to 25 seats', 'Annual commitment', 'SLA on license server'],
    features: ['Everything in Shop', 'Multi-branch workspaces', 'API / webhooks', 'Custom domain portal', 'Owner SLA pathway'],
  },
  {
    id: 'lifetime', code: 'L', name: 'Lifetime', priceHint: 'R 14 999 · one-time',
    seats: 1, days: 36500, purchasable: true,
    limits: ['1 seat', 'Solo feature group', 'No renewals'],
    features: ['Solo feature set', 'One-time buyout', 'No annual renewal'],
  },
  {
    id: 'enterprise', code: 'E', name: 'Enterprise', priceHint: 'R 29 999 · one-time',
    seats: 25, days: 36500, purchasable: true,
    limits: ['Up to 25 seats', 'Custom commercial terms'],
    features: ['Multi-branch feature set', 'Lifetime term', 'Priority owner support'],
  },
]

export function purchasableTiers() {
  return TIERS.filter((t) => t.purchasable !== false)
}

export function normalizePlanId(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const upper = s.toUpperCase()
  if (PLAN_CODES[upper]) return PLAN_CODES[upper]
  if (PLAN_CODES[upper[0]] && upper.length === 1) return PLAN_CODES[upper[0]]
  const lower = s.toLowerCase()
  if (PLAN_ID_TO_CODE[lower]) return lower
  if (lower.includes('enterprise')) return 'enterprise'
  if (lower.includes('lifetime')) return 'lifetime'
  if (lower.includes('multi') || lower.includes('branch')) return 'multi'
  if (lower.includes('shop') || lower.includes('pro')) return 'shop'
  if (lower.includes('solo') || lower.includes('standard')) return 'solo'
  if (lower.includes('trial')) return 'trial'
  return lower
}

export function getTier(raw) {
  const id = normalizePlanId(raw)
  return TIERS.find((t) => t.id === id) || null
}

export function planCodeForId(id) {
  return PLAN_ID_TO_CODE[normalizePlanId(id)] || 'S'
}

export function featurePlanGroup(raw) {
  const id = normalizePlanId(raw)
  if (id === 'trial') return 'trial'
  if (id === 'lifetime') return 'solo'
  if (id === 'enterprise') return 'multi'
  if (id === 'solo' || id === 'shop' || id === 'multi') return id
  return 'solo'
}

export const COMPARISON_COLUMNS = ['trial', 'solo', 'shop', 'multi', 'lifetime', 'enterprise']

export const COMPARISON_ROWS = [
  { id: 'price', label: 'Guide price (ZAR)', values: { trial: 'Free', solo: 'R 1 999/yr', shop: 'R 4 999/yr', multi: 'R 11 999/yr', lifetime: 'R 14 999 once', enterprise: 'R 29 999 once' } },
  { id: 'billing', label: 'Billing model', values: { trial: '7-day trial', solo: 'Annual sub', shop: 'Annual sub', multi: 'Annual sub', lifetime: 'One-time', enterprise: 'One-time' } },
  { id: 'seats', label: 'Device seats', values: { trial: '1', solo: '1', shop: '5', multi: '25', lifetime: '1', enterprise: '25' } },
  { id: 'invoices', label: 'Invoices & quotes', values: { trial: true, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'jobs', label: 'Job cards / tickets', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'whatsapp', label: 'WhatsApp & portal', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'cloud', label: 'Cloud restore', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'team', label: 'Team seats & roles', values: { trial: false, solo: false, shop: true, multi: true, lifetime: false, enterprise: true } },
  { id: 'accounting', label: 'Accounting / bank / payroll', values: { trial: false, solo: false, shop: true, multi: true, lifetime: false, enterprise: true } },
  { id: 'branches', label: 'Multi-branch workspaces', values: { trial: false, solo: false, shop: false, multi: true, lifetime: false, enterprise: true } },
  { id: 'api', label: 'API / webhooks', values: { trial: false, solo: false, shop: false, multi: true, lifetime: false, enterprise: true } },
  { id: 'sla', label: 'Priority / SLA support', values: { trial: false, solo: false, shop: true, multi: true, lifetime: false, enterprise: true } },
]

export function comparisonColumns(includeTrial = true) {
  const ids = includeTrial ? COMPARISON_COLUMNS : COMPARISON_COLUMNS.filter((id) => id !== 'trial')
  return ids.map((id) => getTier(id)).filter(Boolean)
}

export function cellValue(row, planId) {
  const v = row?.values?.[planId]
  if (v === true) return 'yes'
  if (v === false) return 'no'
  if (v == null) return '—'
  return String(v)
}
