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
    version: '0.1.0',
    status: 'active',
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
  return {
    core: CORE_MODULE.status || 'stable',
    it: IT_MODULE.status || 'stable',
    retail: MODULE_REGISTRY.retail?.status || 'planned',
    trades: MODULE_REGISTRY.trades?.status || 'planned',
    automotive: MODULE_REGISTRY.automotive?.status || 'planned',
    consulting: MODULE_REGISTRY.consulting?.status || 'planned',
    hospitality: MODULE_REGISTRY.hospitality?.status || 'planned',
  }
}

export function getVerticalModule(moduleId) {
  return MODULE_REGISTRY[moduleId] || null
}
