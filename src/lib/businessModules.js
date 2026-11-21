/**
 * Business modules — capability packs per vertical.
 */

import { IT_DOCUMENT_TEMPLATES } from './itDocumentTemplates.js'
import { IT_SERVICE_PRESETS, ACCOUNT_TYPES, SUPPORT_TYPES } from './itCatalog.js'
import {
  RETAIL_PRODUCT_PRESETS,
  RETAIL_SERVICE_PRESETS,
  RETAIL_ACCOUNT_TYPES,
  RETAIL_DOCUMENT_STUBS,
} from './retailCatalog.js'
import {
  TRADES_SERVICE_PRESETS,
  TRADES_PRODUCT_PRESETS,
  TRADES_ACCOUNT_TYPES,
  TRADES_DOCUMENT_STUBS,
} from './tradesCatalog.js'
import {
  AUTO_SERVICE_PRESETS,
  AUTO_PRODUCT_PRESETS,
  AUTO_ACCOUNT_TYPES,
  AUTO_DOCUMENT_STUBS,
} from './automotiveCatalog.js'
import {
  CONSULTING_SERVICE_PRESETS,
  CONSULTING_PRODUCT_PRESETS,
  CONSULTING_ACCOUNT_TYPES,
  CONSULTING_DOCUMENT_STUBS,
} from './consultingCatalog.js'
import {
  HOSPITALITY_SERVICE_PRESETS,
  HOSPITALITY_PRODUCT_PRESETS,
  HOSPITALITY_ACCOUNT_TYPES,
  HOSPITALITY_DOCUMENT_STUBS,
} from './hospitalityCatalog.js'
import {
  HEALTH_BEAUTY_SERVICE_PRESETS,
  HEALTH_BEAUTY_PRODUCT_PRESETS,
  HEALTH_BEAUTY_ACCOUNT_TYPES,
  HEALTH_BEAUTY_DOCUMENT_STUBS,
} from './healthBeautyCatalog.js'
import {
  MEDICAL_SERVICE_PRESETS,
  MEDICAL_PRODUCT_PRESETS,
  MEDICAL_ACCOUNT_TYPES,
  MEDICAL_DOCUMENT_STUBS,
} from './medicalCatalog.js'
import {
  LEGAL_SERVICE_PRESETS,
  LEGAL_PRODUCT_PRESETS,
  LEGAL_ACCOUNT_TYPES,
  LEGAL_DOCUMENT_STUBS,
} from './legalCatalog.js'
import { AGRI_SERVICE_PRESETS, AGRI_PRODUCT_PRESETS, AGRI_ACCOUNT_TYPES, AGRI_DOCUMENT_STUBS } from './agricultureCatalog.js'
import { ACCOUNTING_SERVICE_PRESETS, ACCOUNTING_PRODUCT_PRESETS, ACCOUNTING_ACCOUNT_TYPES, ACCOUNTING_DOCUMENT_STUBS } from './accountingCatalog.js'
import { LOGISTICS_SERVICE_PRESETS, LOGISTICS_PRODUCT_PRESETS, LOGISTICS_ACCOUNT_TYPES, LOGISTICS_DOCUMENT_STUBS } from './logisticsCatalog.js'
import { EDU_SERVICE_PRESETS, EDU_PRODUCT_PRESETS, EDU_ACCOUNT_TYPES, EDU_DOCUMENT_STUBS } from './educationCatalog.js'
import { MFG_SERVICE_PRESETS, MFG_PRODUCT_PRESETS, MFG_ACCOUNT_TYPES, MFG_DOCUMENT_STUBS } from './manufacturingCatalog.js'
import { PROP_SERVICE_PRESETS, PROP_PRODUCT_PRESETS, PROP_ACCOUNT_TYPES, PROP_DOCUMENT_STUBS } from './propertyCatalog.js'
import { SEC_SERVICE_PRESETS, SEC_PRODUCT_PRESETS, SEC_ACCOUNT_TYPES, SEC_DOCUMENT_STUBS } from './securityCatalog.js'
import { CLEAN_SERVICE_PRESETS, CLEAN_PRODUCT_PRESETS, CLEAN_ACCOUNT_TYPES, CLEAN_DOCUMENT_STUBS } from './cleaningCatalog.js'
import { CREATIVE_SERVICE_PRESETS, CREATIVE_PRODUCT_PRESETS, CREATIVE_ACCOUNT_TYPES, CREATIVE_DOCUMENT_STUBS } from './creativeCatalog.js'
import { NPO_SERVICE_PRESETS, NPO_PRODUCT_PRESETS, NPO_ACCOUNT_TYPES, NPO_DOCUMENT_STUBS } from './nonprofitCatalog.js'

export const IT_MODULE = {
  id: 'it',
  label: 'IT / Electronics workshop',
  version: '1.0.0',
  status: 'stable',
  description:
    'Job cards, device diagnosis, service presets, document studio (64+ templates), account types for MSP/workshop.',
  routes: ['/tickets', '/documents', '/products', '/wa-templates'],
  navKeys: ['tickets', 'documents', 'products'],
  features: {
    jobCards: true,
    techDiagnose: true,
    documentStudio: true,
    servicePresets: true,
    deviceIntake: true,
    loaners: true,
  },
  catalogs: {
    servicePresets: IT_SERVICE_PRESETS,
    accountTypes: ACCOUNT_TYPES,
    supportTypes: SUPPORT_TYPES,
    documentCount: () => IT_DOCUMENT_TEMPLATES.length,
  },
  documentTemplates: IT_DOCUMENT_TEMPLATES,
}

export const CORE_MODULE = {
  id: 'core',
  label: 'Core desk',
  version: '1.0.0',
  status: 'stable',
  routes: ['/', '/invoices', '/quotes', '/clients', '/payments', '/expenses', '/reports', '/settings'],
  features: {
    invoices: true,
    quotes: true,
    clients: true,
    payments: true,
    expenses: true,
    reports: true,
  },
}

export const MODULE_REGISTRY = {
  core: CORE_MODULE,
  it: IT_MODULE,
  jobs: {
    id: 'jobs',
    label: 'Jobs / field work',
    routes: ['/tickets'],
    features: { jobCards: true },
  },
  documents: {
    id: 'documents',
    label: 'Document studio',
    routes: ['/documents'],
    features: { documentStudio: true },
  },
  products: {
    id: 'products',
    label: 'Products & stock',
    routes: ['/products'],
    features: { products: true },
  },
  retail: {
    id: 'retail',
    label: 'Retail / POS / Shop',
    version: '1.0.0',
    status: 'stable',
    description: 'Counter sales presets, account types, return/till/supplier document stubs.',
    routes: ['/products', '/payments', '/invoices'],
    features: { products: true, payments: true, retailPresets: true },
    catalogs: {
      productPresets: RETAIL_PRODUCT_PRESETS,
      servicePresets: RETAIL_SERVICE_PRESETS,
      accountTypes: RETAIL_ACCOUNT_TYPES,
      documentStubs: RETAIL_DOCUMENT_STUBS,
    },
  },
  trades: {
    id: 'trades',
    label: 'Trades / Construction',
    version: '1.0.0',
    status: 'stable',
    description: 'Call-outs, labour, materials, site variation and completion notes.',
    routes: ['/tickets', '/products', '/quotes'],
    features: { jobCards: true, tradesPresets: true },
    catalogs: {
      servicePresets: TRADES_SERVICE_PRESETS,
      productPresets: TRADES_PRODUCT_PRESETS,
      accountTypes: TRADES_ACCOUNT_TYPES,
      documentStubs: TRADES_DOCUMENT_STUBS,
    },
  },
  automotive: {
    id: 'automotive',
    label: 'Automotive / Workshop',
    version: '1.0.0',
    status: 'stable',
    description: 'Diagnostics, labour, service, tyres, parts, job card and QC docs.',
    routes: ['/tickets', '/products'],
    features: { jobCards: true, autoPresets: true },
    catalogs: {
      servicePresets: AUTO_SERVICE_PRESETS,
      productPresets: AUTO_PRODUCT_PRESETS,
      accountTypes: AUTO_ACCOUNT_TYPES,
      documentStubs: AUTO_DOCUMENT_STUBS,
    },
  },
  consulting: {
    id: 'consulting',
    label: 'Consulting / Professional services',
    version: '1.0.0',
    status: 'stable',
    description: 'Retainers, T&M, SOW and progress notes.',
    routes: ['/tickets', '/products', '/documents', '/quotes'],
    features: { jobCards: true, consultingPresets: true },
    catalogs: {
      servicePresets: CONSULTING_SERVICE_PRESETS,
      productPresets: CONSULTING_PRODUCT_PRESETS,
      accountTypes: CONSULTING_ACCOUNT_TYPES,
      documentStubs: CONSULTING_DOCUMENT_STUBS,
    },
  },
  hospitality: {
    id: 'hospitality',
    label: 'Hospitality / Café / Guest house',
    version: '1.0.0',
    status: 'stable',
    description: 'Rooms, F&B, functions, booking and event order sheets.',
    routes: ['/invoices', '/quotes', '/products', '/documents'],
    features: { products: true, hospitalityPresets: true },
    catalogs: {
      servicePresets: HOSPITALITY_SERVICE_PRESETS,
      productPresets: HOSPITALITY_PRODUCT_PRESETS,
      accountTypes: HOSPITALITY_ACCOUNT_TYPES,
      documentStubs: HOSPITALITY_DOCUMENT_STUBS,
    },
  },
  health_beauty: {
    id: 'health_beauty',
    label: 'Health / Beauty / Salon',
    version: '1.0.0',
    status: 'stable',
    description: 'Salon, spa and wellness services, retail and consent/aftercare docs.',
    routes: ['/products', '/tickets', '/documents', '/invoices'],
    features: { products: true, jobCards: true, healthBeautyPresets: true },
    catalogs: {
      servicePresets: HEALTH_BEAUTY_SERVICE_PRESETS,
      productPresets: HEALTH_BEAUTY_PRODUCT_PRESETS,
      accountTypes: HEALTH_BEAUTY_ACCOUNT_TYPES,
      documentStubs: HEALTH_BEAUTY_DOCUMENT_STUBS,
    },
  },
  medical: {
    id: 'medical',
    label: 'Medical / Clinic / Health',
    version: '1.0.0',
    status: 'stable',
    description: 'Consults, procedures, allied health, consent and certificates.',
    routes: ['/tickets', '/products', '/documents', '/invoices'],
    features: { jobCards: true, products: true, medicalPresets: true },
    catalogs: {
      servicePresets: MEDICAL_SERVICE_PRESETS,
      productPresets: MEDICAL_PRODUCT_PRESETS,
      accountTypes: MEDICAL_ACCOUNT_TYPES,
      documentStubs: MEDICAL_DOCUMENT_STUBS,
    },
  },
  legal: {
    id: 'legal',
    label: 'Legal / Attorneys',
    version: '1.0.0',
    status: 'stable',
    description: 'Mandates, fee notes, matter status, retainers and disbursements.',
    routes: ['/tickets', '/quotes', '/invoices', '/documents', '/products'],
    features: { jobCards: true, products: true, legalPresets: true },
    catalogs: {
      servicePresets: LEGAL_SERVICE_PRESETS,
      productPresets: LEGAL_PRODUCT_PRESETS,
      accountTypes: LEGAL_ACCOUNT_TYPES,
      documentStubs: LEGAL_DOCUMENT_STUBS,
    },
  },
  agriculture: {
    id: 'agriculture',
    label: 'Agriculture / Farming',
    version: '1.0.0',
    status: 'stable',
    description: 'Farm services, inputs, seasonal work and field notes.',
    routes: ['/tickets', '/products', '/documents'],
    features: { jobCards: true, agriculturePresets: true },
    catalogs: {
      servicePresets: AGRI_SERVICE_PRESETS,
      productPresets: AGRI_PRODUCT_PRESETS,
      accountTypes: AGRI_ACCOUNT_TYPES,
      documentStubs: AGRI_DOCUMENT_STUBS,
    },
  },
  accounting: {
    id: 'accounting',
    label: 'Accounting / Bookkeeping',
    version: '1.0.0',
    status: 'stable',
    description: 'Bookkeeping packs, compliance packs and professional fee notes.',
    routes: ['/documents', '/invoices', '/quotes'],
    features: { documents: true, accountingPresets: true },
    catalogs: {
      servicePresets: ACCOUNTING_SERVICE_PRESETS,
      productPresets: ACCOUNTING_PRODUCT_PRESETS,
      accountTypes: ACCOUNTING_ACCOUNT_TYPES,
      documentStubs: ACCOUNTING_DOCUMENT_STUBS,
    },
  },
  logistics: {
    id: 'logistics',
    label: 'Logistics / Courier / Transport',
    version: '1.0.0',
    status: 'stable',
    description: 'Trips, deliveries, freight notes and POD-oriented jobs.',
    routes: ['/tickets', '/products', '/documents'],
    features: { jobCards: true, logisticsPresets: true },
    catalogs: {
      servicePresets: LOGISTICS_SERVICE_PRESETS,
      productPresets: LOGISTICS_PRODUCT_PRESETS,
      accountTypes: LOGISTICS_ACCOUNT_TYPES,
      documentStubs: LOGISTICS_DOCUMENT_STUBS,
    },
  },
  education: {
    id: 'education',
    label: 'Education / Training',
    version: '1.0.0',
    status: 'stable',
    description: 'Courses, enrolments, assessments and training packs.',
    routes: ['/tickets', '/documents', '/invoices'],
    features: { jobCards: true, educationPresets: true },
    catalogs: {
      servicePresets: EDU_SERVICE_PRESETS,
      productPresets: EDU_PRODUCT_PRESETS,
      accountTypes: EDU_ACCOUNT_TYPES,
      documentStubs: EDU_DOCUMENT_STUBS,
    },
  },
  manufacturing: {
    id: 'manufacturing',
    label: 'Manufacturing / Light industry',
    version: '1.0.0',
    status: 'stable',
    description: 'Work orders, BOMs-lite, QC and production notes.',
    routes: ['/tickets', '/products', '/documents'],
    features: { jobCards: true, manufacturingPresets: true },
    catalogs: {
      servicePresets: MFG_SERVICE_PRESETS,
      productPresets: MFG_PRODUCT_PRESETS,
      accountTypes: MFG_ACCOUNT_TYPES,
      documentStubs: MFG_DOCUMENT_STUBS,
    },
  },
  property: {
    id: 'property',
    label: 'Real estate / Property',
    version: '1.0.0',
    status: 'stable',
    description: 'Listings support, mandates, inspections and agency fees.',
    routes: ['/tickets', '/documents', '/invoices'],
    features: { jobCards: true, propertyPresets: true },
    catalogs: {
      servicePresets: PROP_SERVICE_PRESETS,
      productPresets: PROP_PRODUCT_PRESETS,
      accountTypes: PROP_ACCOUNT_TYPES,
      documentStubs: PROP_DOCUMENT_STUBS,
    },
  },
  security: {
    id: 'security',
    label: 'Security / Guarding',
    version: '1.0.0',
    status: 'stable',
    description: 'Shifts, sites, patrol and incident-oriented jobs.',
    routes: ['/tickets', '/documents', '/expenses'],
    features: { jobCards: true, securityPresets: true },
    catalogs: {
      servicePresets: SEC_SERVICE_PRESETS,
      productPresets: SEC_PRODUCT_PRESETS,
      accountTypes: SEC_ACCOUNT_TYPES,
      documentStubs: SEC_DOCUMENT_STUBS,
    },
  },
  cleaning: {
    id: 'cleaning',
    label: 'Cleaning / Facilities',
    version: '1.0.0',
    status: 'stable',
    description: 'Contracts, site cleans and consumables.',
    routes: ['/tickets', '/products', '/documents'],
    features: { jobCards: true, cleaningPresets: true },
    catalogs: {
      servicePresets: CLEAN_SERVICE_PRESETS,
      productPresets: CLEAN_PRODUCT_PRESETS,
      accountTypes: CLEAN_ACCOUNT_TYPES,
      documentStubs: CLEAN_DOCUMENT_STUBS,
    },
  },
  creative: {
    id: 'creative',
    label: 'Marketing / Creative agency',
    version: '1.0.0',
    status: 'stable',
    description: 'Retainers, campaigns, deliverables and creative briefs.',
    routes: ['/tickets', '/documents', '/quotes'],
    features: { jobCards: true, creativePresets: true },
    catalogs: {
      servicePresets: CREATIVE_SERVICE_PRESETS,
      productPresets: CREATIVE_PRODUCT_PRESETS,
      accountTypes: CREATIVE_ACCOUNT_TYPES,
      documentStubs: CREATIVE_DOCUMENT_STUBS,
    },
  },
  nonprofit: {
    id: 'nonprofit',
    label: 'Non-profit / NGO / Church',
    version: '1.0.0',
    status: 'stable',
    description: 'Donations support, project notes and donor-facing documents.',
    routes: ['/documents', '/invoices', '/clients'],
    features: { documents: true, nonprofitPresets: true },
    catalogs: {
      servicePresets: NPO_SERVICE_PRESETS,
      productPresets: NPO_PRODUCT_PRESETS,
      accountTypes: NPO_ACCOUNT_TYPES,
      documentStubs: NPO_DOCUMENT_STUBS,
    },
  },
  field: {
    id: 'field',
    label: 'Field service',
    routes: ['/tickets', '/expenses'],
    features: { jobCards: true, expenses: true },
  },
}

export function modulesForBusinessType(type) {
  const ids = type?.modules || ['core']
  return ids.map((id) => MODULE_REGISTRY[id]).filter(Boolean)
}

export function businessHasModule(type, moduleId) {
  return (type?.modules || []).includes(moduleId)
}

export function filterNavByModules(links, type) {
  const mods = new Set(type?.modules || ['core'])
  return (links || []).filter((link) => {
    const to = String(link.to || '')
    if (to.startsWith('/documents') && !mods.has('documents') && !mods.has('it')) return false
    return true
  })
}

export function smeModuleScoreboard() {
  const keys = [
    'core', 'it', 'retail', 'trades', 'automotive', 'consulting', 'hospitality',
    'health_beauty', 'medical', 'legal', 'agriculture', 'accounting', 'logistics',
    'education', 'manufacturing', 'property', 'security', 'cleaning', 'creative', 'nonprofit',
  ]
  const out = {}
  for (const k of keys) {
    if (k === 'core') out[k] = CORE_MODULE.status || 'stable'
    else if (k === 'it') out[k] = IT_MODULE.status || 'stable'
    else out[k] = MODULE_REGISTRY[k]?.status || 'planned'
  }
  out._summary = {
    stable: Object.values(out).filter((s) => s === 'stable').length,
    planned: Object.values(out).filter((s) => s === 'planned').length,
    total: keys.length,
  }
  return out
}

export function getVerticalModule(moduleId) {
  return MODULE_REGISTRY[moduleId] || null
}
