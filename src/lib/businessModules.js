/**
 * Business modules — capability packs per vertical.
 * IT module is compiled as one working unit (routes, nav, catalogs, documents).
 */

import { IT_DOCUMENT_TEMPLATES } from './itDocumentTemplates.js'
import { IT_SERVICE_PRESETS, ACCOUNT_TYPES, SUPPORT_TYPES } from './itCatalog.js'
import {
  RETAIL_PRODUCT_PRESETS,
  RETAIL_SERVICE_PRESETS,
  RETAIL_ACCOUNT_TYPES,
  RETAIL_DOCUMENT_STUBS,
} from './retailCatalog.js'

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
    version: '0.1.0',
    status: 'active',
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
  }
}

export function getVerticalModule(moduleId) {
  return MODULE_REGISTRY[moduleId] || null
}
