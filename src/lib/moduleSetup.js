/** Module-specific onboarding steps for completed SME verticals */
import { getBusinessType } from './businessTypes.js'
import { CATALOG_PACKS } from './installCatalogPacks.js'

export const MODULE_SETUP = {
  it_msp: {
    packKey: 'it',
    title: 'IT / electronics workspace',
    intro: 'Prep the desk for job cards, device work and document studio.',
    checklist: [
      'Install the IT service & parts pack',
      'Fill workshop hours and support email under Company Details',
      'Use Documents for assessments and tech diagnose reports',
      'Tickets for job cards with device intake',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/tickets', label: 'Job cards' },
      { to: '/documents', label: 'Document studio' },
      { to: '/products', label: 'Catalog' },
    ],
  },
  retail: {
    packKey: 'retail',
    title: 'Retail / shop workspace',
    intro: 'Counter sales, stock and simple returns paperwork.',
    checklist: [
      'Install the Retail product & service pack',
      'Set trading hours and till label under Company Details',
      'Use Products for stock levels',
      'Documents for return note / till variance when needed',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/products', label: 'Products & stock' },
      { to: '/invoices', label: 'Invoices' },
      { to: '/payments', label: 'Payments' },
    ],
  },
  trades: {
    packKey: 'trades',
    title: 'Trades / construction workspace',
    intro: 'Call-outs, labour, materials and site paperwork.',
    checklist: [
      'Install the Trades labour & materials pack',
      'Set service area and call-out note under Company Details',
      'Job cards default to on-site / call-out',
      'Documents for site instruction and practical completion',
    ],
    defaults: { defaultSupportType: 'onsite', suggestVat: true },
    routes: [
      { to: '/tickets', label: 'Job cards' },
      { to: '/quotes', label: 'Quotes' },
      { to: '/products', label: 'Materials' },
    ],
  },
  automotive: {
    packKey: 'automotive',
    title: 'Automotive / workshop workspace',
    intro: 'Diagnostics, labour, parts and vehicle job cards.',
    checklist: [
      'Install the Automotive service & parts pack',
      'Set bay hours and bay count under Company Details',
      'Job cards default to workshop / vehicle',
      'Documents for authority to repair and QC handover',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/tickets', label: 'Job cards' },
      { to: '/products', label: 'Parts & services' },
      { to: '/documents', label: 'Vehicle docs' },
    ],
  },
  hospitality: {
    packKey: 'hospitality',
    title: 'Hospitality workspace',
    intro: 'Rooms, F&B, functions and guest-facing paperwork.',
    checklist: [
      'Install the Hospitality F&B and rooms pack',
      'Set trading hours / kitchen note on company details',
      'Use Quotes for functions and Invoices for walk-ins',
      'Documents for booking confirmation and function order sheet',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/invoices', label: 'Invoices' },
      { to: '/quotes', label: 'Quotes / functions' },
      { to: '/products', label: 'Menu & rooms' },
    ],
  },
  health_beauty: {
    packKey: 'health_beauty',
    title: 'Health & beauty workspace',
    intro: 'Salon, spa and wellness services with consent and aftercare paperwork.',
    checklist: [
      'Install the Health & Beauty service pack',
      'Set trading hours under module details',
      'Use Tickets for appointments / treatment cards',
      'Documents for consent and aftercare notes',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/tickets', label: 'Appointments' },
      { to: '/products', label: 'Services & retail' },
      { to: '/documents', label: 'Consent / aftercare' },
    ],
  },
  medical: {
    packKey: 'medical',
    title: 'Medical / clinic workspace',
    intro: 'Consults, procedures, certificates and patient paperwork.',
    checklist: [
      'Install the Medical / Clinic service pack',
      'Set practice hours under module details',
      'Use Tickets for appointments / encounters',
      'Documents for consent, sick notes and referrals',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: false },
    routes: [
      { to: '/tickets', label: 'Appointments' },
      { to: '/invoices', label: 'Invoices' },
      { to: '/documents', label: 'Clinical docs' },
    ],
  },
  legal: {
    packKey: 'legal',
    title: 'Legal / practice workspace',
    intro: 'Mandates, fee notes, matter tracking and disbursements.',
    checklist: [
      'Install the Legal service pack',
      'Set practice number / specialties under module details',
      'Use Tickets as matters / file references',
      'Documents for engagement letters and fee notes',
    ],
    defaults: { defaultSupportType: 'remote', suggestVat: true },
    routes: [
      { to: '/tickets', label: 'Matters' },
      { to: '/quotes', label: 'Quotes' },
      { to: '/documents', label: 'Engagement & fee notes' },
    ],
  },
  consulting: {
    packKey: 'consulting',
    title: 'Consulting workspace',
    intro: 'Retainers, T&M rates, SOW and progress notes.',
    checklist: [
      'Install the Consulting rate pack (hourly, day, retainer)',
      'Add practice number / specialties under Company Details',
      'Job cards default to remote / engagement',
      'Documents for statement of work and status notes',
    ],
    defaults: { defaultSupportType: 'remote', suggestVat: false },
    routes: [
      { to: '/quotes', label: 'Quotes' },
      { to: '/tickets', label: 'Engagements' },
      { to: '/documents', label: 'SOW & notes' },
    ],
  },
}

export function moduleSetupForType(businessTypeId) {
  const type = getBusinessType(businessTypeId)
  const id = type.id === 'beauty' ? 'health_beauty' : type.id
  return MODULE_SETUP[id] || MODULE_SETUP[type.id] || null
}

export async function installModulePack(businessTypeId) {
  const setup = moduleSetupForType(businessTypeId)
  if (!setup?.packKey || !CATALOG_PACKS[setup.packKey]) {
    return { ok: false, n: 0, message: 'No catalog pack for this type' }
  }
  const n = await CATALOG_PACKS[setup.packKey].run()
  return { ok: true, n, label: CATALOG_PACKS[setup.packKey].label }
}
