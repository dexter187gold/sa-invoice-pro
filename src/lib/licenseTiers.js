/**
 * App license plans — must stay aligned with license_owner_ops.PLAN_CATALOG
 * and license_server PLAN_DAYS / PLAN_LABEL.
 *
 * Server codes: T trial · S solo · P shop · M multi · L lifetime · E enterprise
 */

export const PLAN_CODES = {
  T: 'trial',
  S: 'solo',
  P: 'shop',
  M: 'multi',
  L: 'lifetime',
  E: 'enterprise',
}

export const PLAN_ID_TO_CODE = {
  trial: 'T',
  solo: 'S',
  shop: 'P',
  multi: 'M',
  lifetime: 'L',
  enterprise: 'E',
}

export const TIERS = [
  {
    id: 'trial',
    code: 'T',
    name: 'Trial',
    priceHint: '7 days · core workflow',
    seats: 1,
    days: 7,
    purchasable: false,
    features: [
      'Clients, invoices, quotes',
      'Evaluate desk fit before you pay',
      'Upgrade anytime from License',
    ],
  },
  {
    id: 'solo',
    code: 'S',
    name: 'Solo',
    priceHint: '1 device · owner-operator · 12 months',
    seats: 1,
    days: 365,
    purchasable: true,
    features: [
      'Invoices, jobs, WhatsApp, portal',
      'Offline + cloud restore',
      'IT service pack',
      'Themes + Pulse home',
    ],
  },
  {
    id: 'shop',
    code: 'P',
    name: 'Shop',
    priceHint: 'Up to 5 seats · front desk + techs · 24 months',
    seats: 5,
    days: 730,
    purchasable: true,
    recommended: true,
    features: [
      'Everything in Solo',
      'Audit log',
      'Ageing reports + bulk chase',
      'Recurring + retainers',
      'Payroll, accounting, bank import',
      'Priority license support',
    ],
  },
  {
    id: 'multi',
    code: 'M',
    name: 'Multi-branch',
    priceHint: 'Up to 25 seats · branches · 12 months',
    seats: 25,
    days: 365,
    purchasable: true,
    features: [
      'Everything in Shop',
      'Per-branch workspaces',
      'API / webhooks',
      'Custom domain portal',
      'SLA on license server',
    ],
  },
  {
    id: 'lifetime',
    code: 'L',
    name: 'Lifetime',
    priceHint: '1 seat · no renewals',
    seats: 1,
    days: 36500,
    purchasable: true,
    features: [
      'Solo feature set',
      'One-time activation',
      'Long-term owner licence',
    ],
  },
  {
    id: 'enterprise',
    code: 'E',
    name: 'Enterprise',
    priceHint: 'Multi-branch lifetime · up to 25 seats',
    seats: 25,
    days: 36500,
    purchasable: true,
    features: [
      'Everything in Multi-branch',
      'Lifetime term',
      'Priority owner support',
    ],
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
  if (lower.includes('enterprise') || lower === 'e') return 'enterprise'
  if (lower.includes('lifetime') || lower === 'l') return 'lifetime'
  if (lower.includes('multi') || lower.includes('branch') || lower === 'm') return 'multi'
  if (lower.includes('shop') || lower.includes('pro') || lower === 'p') return 'shop'
  if (lower.includes('solo') || lower.includes('standard') || lower === 's') return 'solo'
  if (lower.includes('trial') || lower === 't') return 'trial'
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
  { id: 'seats', label: 'Devices / seats', values: { trial: '1', solo: '1', shop: '5', multi: '25', lifetime: '1', enterprise: '25' } },
  { id: 'term', label: 'Term', values: { trial: '7 days', solo: '12 mo', shop: '24 mo', multi: '12 mo', lifetime: 'Lifetime', enterprise: 'Lifetime' } },
  { id: 'invoices', label: 'Invoices & quotes', values: { trial: true, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'jobs', label: 'Job cards / tickets', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'whatsapp', label: 'WhatsApp chase & templates', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'portal', label: 'Client portal', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'cloud', label: 'Cloud restore / multi-device sync', values: { trial: false, solo: true, shop: true, multi: true, lifetime: true, enterprise: true } },
  { id: 'accounting', label: 'Accounting, bank, payroll', values: { trial: false, solo: false, shop: true, multi: true, lifetime: false, enterprise: true } },
  { id: 'team', label: 'Team seats & roles', values: { trial: false, solo: false, shop: true, multi: true, lifetime: false, enterprise: true } },
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
