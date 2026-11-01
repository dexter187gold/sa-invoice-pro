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

/** Reverse map: tier id → server plan code */
export const PLAN_ID_TO_CODE = {
  trial: 'T',
  solo: 'S',
  shop: 'P',
  multi: 'M',
  lifetime: 'L',
  enterprise: 'E',
}

/**
 * Full catalogue (includes trial / lifetime for status display).
 * Checkout UI typically filters with `purchasable: true`.
 */
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

/** Plans shown on License buy cards */
export function purchasableTiers() {
  return TIERS.filter((t) => t.purchasable !== false)
}

/**
 * Normalize any server/app plan string to a tier id (solo, shop, multi, …).
 */
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

/** Feature-gate group: trial→trial, lifetime→solo, enterprise→multi */
export function featurePlanGroup(raw) {
  const id = normalizePlanId(raw)
  if (id === 'trial') return 'trial'
  if (id === 'lifetime') return 'solo'
  if (id === 'enterprise') return 'multi'
  if (id === 'solo' || id === 'shop' || id === 'multi') return id
  return 'solo'
}
