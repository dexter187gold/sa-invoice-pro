/**
 * SA SME business types — owner catalogue.
 * Each type shares the same desk shell; modules + accent only change emphasis.
 */

export const BUSINESS_TYPES = [
  {
    id: 'it_msp',
    label: 'IT / MSP / Electronics',
    short: 'IT',
    desc: 'Workshops, MSPs, device repair, managed services',
    modules: ['core', 'it', 'jobs', 'documents'],
    accent: '#14b8a6',
    navStyle: 'optic',
  },
  {
    id: 'consulting',
    label: 'Consulting / Professional services',
    short: 'Consulting',
    desc: 'Advisors, freelancers, B2B services',
    modules: ['core', 'jobs', 'documents'],
    accent: '#38bdf8',
    navStyle: 'clean',
  },
  {
    id: 'retail',
    label: 'Retail / POS / Shop',
    short: 'Retail',
    desc: 'Shops, spaza, counter sales, stock',
    modules: ['core', 'retail', 'products'],
    accent: '#f59e0b',
    navStyle: 'shop',
  },
  {
    id: 'trades',
    label: 'Trades / Construction',
    short: 'Trades',
    desc: 'Plumbing, electrical, building, handyman',
    modules: ['core', 'jobs', 'field'],
    accent: '#f97316',
    navStyle: 'field',
  },
  {
    id: 'automotive',
    label: 'Automotive / Workshop',
    short: 'Auto',
    desc: 'Fitment centres, mechanics, panel',
    modules: ['core', 'jobs', 'products'],
    accent: '#64748b',
    navStyle: 'field',
  },
  {
    id: 'agriculture',
    label: 'Agriculture / Farming',
    short: 'Agri',
    desc: 'Farms, agri-supply, co-ops',
    modules: ['core', 'jobs'],
    accent: '#84cc16',
    navStyle: 'clean',
  },
  {
    id: 'hospitality',
    label: 'Hospitality / Food service',
    short: 'Hospitality',
    desc: 'Restaurants, cafés, catering, B&B',
    modules: ['core', 'retail', 'products'],
    accent: '#fb7185',
    navStyle: 'shop',
  },
  {
    id: 'beauty',
    label: 'Beauty / Salon / Spa',
    short: 'Beauty',
    desc: 'Salons, barbers, wellness',
    modules: ['core', 'jobs', 'products'],
    accent: '#e879f9',
    navStyle: 'soft',
  },
  {
    id: 'medical',
    label: 'Medical / Clinic / Health',
    short: 'Medical',
    desc: 'Practices, clinics, allied health',
    modules: ['core', 'jobs', 'documents'],
    accent: '#22d3ee',
    navStyle: 'clean',
  },
  {
    id: 'legal',
    label: 'Legal / Attorneys',
    short: 'Legal',
    desc: 'Law firms, conveyancing, legal aid',
    modules: ['core', 'documents', 'jobs'],
    accent: '#a78bfa',
    navStyle: 'clean',
  },
  {
    id: 'accounting',
    label: 'Accounting / Bookkeeping',
    short: 'Accounting',
    desc: 'Tax practitioners, bookkeepers, CFOs-as-a-service',
    modules: ['core', 'documents'],
    accent: '#34d399',
    navStyle: 'clean',
  },
  {
    id: 'logistics',
    label: 'Logistics / Courier / Transport',
    short: 'Logistics',
    desc: 'Deliveries, fleet, courier',
    modules: ['core', 'jobs', 'field'],
    accent: '#0ea5e9',
    navStyle: 'field',
  },
  {
    id: 'education',
    label: 'Education / Training',
    short: 'Education',
    desc: 'Training centres, tutors, academies',
    modules: ['core', 'jobs', 'documents'],
    accent: '#818cf8',
    navStyle: 'soft',
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing / Light industry',
    short: 'Manufacturing',
    desc: 'Workshops, fabrication, small factories',
    modules: ['core', 'jobs', 'products'],
    accent: '#94a3b8',
    navStyle: 'field',
  },
  {
    id: 'property',
    label: 'Real estate / Property',
    short: 'Property',
    desc: 'Agents, rentals, body corporates',
    modules: ['core', 'documents', 'jobs'],
    accent: '#2dd4bf',
    navStyle: 'clean',
  },
  {
    id: 'security',
    label: 'Security / Guarding',
    short: 'Security',
    desc: 'Guarding, armed response admin, CCTV install',
    modules: ['core', 'jobs', 'field'],
    accent: '#f43f5e',
    navStyle: 'optic',
  },
  {
    id: 'cleaning',
    label: 'Cleaning / Facilities',
    short: 'Cleaning',
    desc: 'Contract cleaning, facilities management',
    modules: ['core', 'jobs', 'field'],
    accent: '#4ade80',
    navStyle: 'field',
  },
  {
    id: 'creative',
    label: 'Marketing / Creative agency',
    short: 'Creative',
    desc: 'Agencies, designers, media',
    modules: ['core', 'jobs', 'documents'],
    accent: '#c084fc',
    navStyle: 'soft',
  },
  {
    id: 'nonprofit',
    label: 'Non-profit / NGO / Church',
    short: 'NPO',
    desc: 'NPOs, churches, community orgs',
    modules: ['core', 'documents'],
    accent: '#fbbf24',
    navStyle: 'soft',
  },
  {
    id: 'other',
    label: 'Other / General SME',
    short: 'General',
    desc: 'Any other South African small business',
    modules: ['core'],
    accent: '#14b8a6',
    navStyle: 'optic',
  },
]

const LEGACY_LABEL_MAP = {
  'IT / MSP': 'it_msp',
  Consulting: 'consulting',
  'Retail / POS': 'retail',
  Trades: 'trades',
  Agriculture: 'agriculture',
  Legal: 'legal',
  Medical: 'medical',
  Other: 'other',
}

export function getBusinessType(idOrLabel) {
  const key = String(idOrLabel || '').trim()
  if (!key) return BUSINESS_TYPES.find((t) => t.id === 'it_msp')
  const byId = BUSINESS_TYPES.find((t) => t.id === key)
  if (byId) return byId
  const mapped = LEGACY_LABEL_MAP[key]
  if (mapped) return BUSINESS_TYPES.find((t) => t.id === mapped)
  const byLabel = BUSINESS_TYPES.find((t) => t.label === key || t.short === key)
  return byLabel || BUSINESS_TYPES.find((t) => t.id === 'other')
}

export function businessTypeOptions() {
  return BUSINESS_TYPES.map((t) => ({ value: t.id, label: t.label, desc: t.desc }))
}

export function applyBusinessType(idOrLabel) {
  const type = getBusinessType(idOrLabel)
  const root = document.documentElement
  root.setAttribute('data-business-type', type.id)
  root.setAttribute('data-nav-style', type.navStyle)
  root.style.setProperty('--biz-accent', type.accent)
  root.style.setProperty('--biz-accent-soft', type.accent + '22')
  try {
    localStorage.setItem('sa_business_type', type.id)
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('sa-business-type', { detail: type }))
  } catch {}
  return type
}

export function loadSavedBusinessType(company) {
  try {
    const fromCompany = company?.businessType
    const fromLs = localStorage.getItem('sa_business_type')
    return applyBusinessType(fromCompany || fromLs || 'it_msp')
  } catch {
    return applyBusinessType('it_msp')
  }
}
