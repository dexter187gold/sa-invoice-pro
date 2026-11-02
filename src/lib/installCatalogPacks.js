/** One-click catalog packs by vertical */
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
}

export function packsForBusiness(biz) {
  const id = biz?.id
  const mods = biz?.modules || []
  const out = []
  if (id === 'it_msp' || mods.includes('it')) out.push('it')
  if (id === 'retail' || mods.includes('retail')) out.push('retail')
  if (id === 'trades' || mods.includes('trades')) out.push('trades')
  if (id === 'automotive' || mods.includes('automotive')) out.push('automotive')
  if (id === 'consulting' || mods.includes('consulting')) out.push('consulting')
  if (id === 'hospitality' || mods.includes('hospitality')) out.push('hospitality')
  if (id === 'health_beauty' || id === 'beauty' || mods.includes('health_beauty')) out.push('health_beauty')
  if (id === 'medical' || mods.includes('medical')) out.push('medical')
  if (id === 'legal' || mods.includes('legal')) out.push('legal')
  if (!out.length) out.push('it', 'retail', 'trades', 'automotive', 'consulting', 'hospitality', 'health_beauty', 'medical', 'legal')
  return out
}
