/** One-click catalog packs by vertical — only the pack for the active business type. */
import * as db from './db.js'
import { STORES } from './db.js'
import { IT_SERVICE_PRESETS, IT_PRODUCT_PRESETS, presetToServiceRow, presetToProductRow } from './itCatalog.js'
import { RETAIL_SERVICE_PRESETS, RETAIL_PRODUCT_PRESETS } from './retailCatalog.js'
import { TRADES_SERVICE_PRESETS, TRADES_PRODUCT_PRESETS } from './tradesCatalog.js'
import { AUTO_SERVICE_PRESETS, AUTO_PRODUCT_PRESETS } from './automotiveCatalog.js'
import { CONSULTING_SERVICE_PRESETS, CONSULTING_PRODUCT_PRESETS } from './consultingCatalog.js'
import { HOSPITALITY_SERVICE_PRESETS, HOSPITALITY_PRODUCT_PRESETS } from './hospitalityCatalog.js'
import { HEALTH_BEAUTY_SERVICE_PRESETS, HEALTH_BEAUTY_PRODUCT_PRESETS } from './healthBeautyCatalog.js'
import { MEDICAL_SERVICE_PRESETS, MEDICAL_PRODUCT_PRESETS } from './medicalCatalog.js'
import { LEGAL_SERVICE_PRESETS, LEGAL_PRODUCT_PRESETS } from './legalCatalog.js'
import { AGRI_SERVICE_PRESETS, AGRI_PRODUCT_PRESETS } from './agricultureCatalog.js'
import { ACCOUNTING_SERVICE_PRESETS, ACCOUNTING_PRODUCT_PRESETS } from './accountingCatalog.js'
import { LOGISTICS_SERVICE_PRESETS, LOGISTICS_PRODUCT_PRESETS } from './logisticsCatalog.js'
import { EDU_SERVICE_PRESETS, EDU_PRODUCT_PRESETS } from './educationCatalog.js'
import { MFG_SERVICE_PRESETS, MFG_PRODUCT_PRESETS } from './manufacturingCatalog.js'
import { PROP_SERVICE_PRESETS, PROP_PRODUCT_PRESETS } from './propertyCatalog.js'
import { SEC_SERVICE_PRESETS, SEC_PRODUCT_PRESETS } from './securityCatalog.js'
import { CLEAN_SERVICE_PRESETS, CLEAN_PRODUCT_PRESETS } from './cleaningCatalog.js'
import { CREATIVE_SERVICE_PRESETS, CREATIVE_PRODUCT_PRESETS } from './creativeCatalog.js'
import { NPO_SERVICE_PRESETS, NPO_PRODUCT_PRESETS } from './nonprofitCatalog.js'

async function install(services, products, stockZero = false) {
  let n = 0
  for (const s of services) {
    await db.add(STORES.services, presetToServiceRow(s))
    n++
  }
  for (const pr of products) {
    await db.add(STORES.products, presetToProductRow(stockZero ? { ...pr, stock: 0 } : pr))
    n++
  }
  return n
}

export const CATALOG_PACKS = {
  it: { label: 'IT pack', run: () => install(IT_SERVICE_PRESETS, IT_PRODUCT_PRESETS) },
  retail: { label: 'Retail pack', run: () => install(RETAIL_SERVICE_PRESETS, RETAIL_PRODUCT_PRESETS, true) },
  trades: { label: 'Trades pack', run: () => install(TRADES_SERVICE_PRESETS, TRADES_PRODUCT_PRESETS) },
  automotive: { label: 'Automotive pack', run: () => install(AUTO_SERVICE_PRESETS, AUTO_PRODUCT_PRESETS) },
  consulting: { label: 'Consulting pack', run: () => install(CONSULTING_SERVICE_PRESETS, CONSULTING_PRODUCT_PRESETS) },
  hospitality: { label: 'Hospitality pack', run: () => install(HOSPITALITY_SERVICE_PRESETS, HOSPITALITY_PRODUCT_PRESETS, true) },
  health_beauty: { label: 'Health & Beauty pack', run: () => install(HEALTH_BEAUTY_SERVICE_PRESETS, HEALTH_BEAUTY_PRODUCT_PRESETS, true) },
  medical: { label: 'Medical / Clinic pack', run: () => install(MEDICAL_SERVICE_PRESETS, MEDICAL_PRODUCT_PRESETS, true) },
  legal: { label: 'Legal pack', run: () => install(LEGAL_SERVICE_PRESETS, LEGAL_PRODUCT_PRESETS, true) },
  agriculture: { label: 'Agriculture pack', run: () => install(AGRI_SERVICE_PRESETS, AGRI_PRODUCT_PRESETS, true) },
  accounting: { label: 'Accounting pack', run: () => install(ACCOUNTING_SERVICE_PRESETS, ACCOUNTING_PRODUCT_PRESETS) },
  logistics: { label: 'Logistics pack', run: () => install(LOGISTICS_SERVICE_PRESETS, LOGISTICS_PRODUCT_PRESETS) },
  education: { label: 'Education pack', run: () => install(EDU_SERVICE_PRESETS, EDU_PRODUCT_PRESETS) },
  manufacturing: { label: 'Manufacturing pack', run: () => install(MFG_SERVICE_PRESETS, MFG_PRODUCT_PRESETS, true) },
  property: { label: 'Property pack', run: () => install(PROP_SERVICE_PRESETS, PROP_PRODUCT_PRESETS) },
  security: { label: 'Security pack', run: () => install(SEC_SERVICE_PRESETS, SEC_PRODUCT_PRESETS) },
  cleaning: { label: 'Cleaning pack', run: () => install(CLEAN_SERVICE_PRESETS, CLEAN_PRODUCT_PRESETS) },
  creative: { label: 'Creative pack', run: () => install(CREATIVE_SERVICE_PRESETS, CREATIVE_PRODUCT_PRESETS) },
  nonprofit: { label: 'Non-profit pack', run: () => install(NPO_SERVICE_PRESETS, NPO_PRODUCT_PRESETS) },
}

export const TYPE_PACK_MAP = {
  it_msp: ['it'],
  retail: ['retail'],
  trades: ['trades'],
  automotive: ['automotive'],
  consulting: ['consulting'],
  hospitality: ['hospitality'],
  beauty: ['health_beauty'],
  health_beauty: ['health_beauty'],
  medical: ['medical'],
  legal: ['legal'],
  agriculture: ['agriculture'],
  accounting: ['accounting'],
  logistics: ['logistics'],
  education: ['education'],
  manufacturing: ['manufacturing'],
  property: ['property'],
  security: ['security'],
  cleaning: ['cleaning'],
  creative: ['creative'],
  nonprofit: ['nonprofit'],
  other: [],
}

export function packsForBusiness(biz) {
  const id = biz?.id
  if (!id) return []
  if (TYPE_PACK_MAP[id] !== undefined) return TYPE_PACK_MAP[id].filter((k) => CATALOG_PACKS[k])
  const mods = biz?.modules || []
  const out = []
  for (const key of Object.keys(CATALOG_PACKS)) {
    if (mods.includes(key)) out.push(key)
  }
  return [...new Set(out)]
}
