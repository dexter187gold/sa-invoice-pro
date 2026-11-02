/** Module-specific onboarding steps for completed SME verticals */
import { getBusinessType } from './businessTypes.js'
import { CATALOG_PACKS } from './installCatalogPacks.js'

export const MODULE_SETUP = {
  it_msp: {
    packKey: 'it',
    title: 'IT / electronics workspace',
    intro: 'Prep the desk for job cards, device work and document studio.',
    checklist: [
      'Install the IT service & parts pack (remote, on-site, workshop SKUs)',
      'Fill workshop hours and support email under Company \u2192 Details',
      'Use Documents for assessments, POPIA and tech diagnose reports',
      'Tickets \u2192 job cards with device intake and status WhatsApp',
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
      'Set trading hours and till label under Company \u2192 Details',
      'Use Products for stock levels and branch transfer when ready',
      'Documents \u2192 return note / till variance when needed',
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
      'Set service area and call-out note under Company \u2192 Details',
      'Job cards default to on-site / call-out',
      'Documents \u2192 site instruction and practical completion',
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
      'Set bay hours and bay count under Company \u2192 Details',
      'Job cards default to workshop / vehicle',
      'Documents \u2192 authority to repair and QC handover',
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
      'Documents \u2192 booking confirmation and function order sheet',
    ],
    defaults: { defaultSupportType: 'workshop', suggestVat: true },
    routes: [
      { to: '/invoices', label: 'Invoices' },
      { to: '/quotes', label: 'Quotes / functions' },
      { to: '/products', label: 'Menu & rooms' },
    ],
  },
  consulting: {
    packKey: 'consulting',
    title: 'Consulting workspace',
    intro: 'Retainers, T&M rates, SOW and progress notes.',
    checklist: [
      'Install the Consulting rate pack (hourly, day, retainer)',
      'Add practice number / specialties under Company \u2192 Details',
      'Job cards default to remote / engagement',
      'Documents \u2192 statement of work and status notes',
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
  return MODULE_SETUP[type.id] || null
}

export async function installModulePack(businessTypeId) {
  const setup = moduleSetupForType(businessTypeId)
  if (!setup?.packKey || !CATALOG_PACKS[setup.packKey]) {
    return { ok: false, n: 0, message: 'No catalog pack for this type' }
  }
  const n = await CATALOG_PACKS[setup.packKey].run()
  return { ok: true, n, label: CATALOG_PACKS[setup.packKey].label }
}
