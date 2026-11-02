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

/** Map business type id → pack keys. Only these install buttons show. */
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
}

/**
 * Packs for the current business type only.
 * Never falls back to "all packs" (that caused IT pack on every module).
 */
export function packsForBusiness(biz) {
  const id = biz?.id
  if (!id) return []
  if (TYPE_PACK_MAP[id]) return TYPE_PACK_MAP[id].filter((k) => CATALOG_PACKS[k])
  const mods = biz?.modules || []
  const out = []
  for (const key of Object.keys(CATALOG_PACKS)) {
    if (mods.includes(key)) out.push(key)
  }
  if (mods.includes('beauty') && CATALOG_PACKS.health_beauty) out.push('health_beauty')
  return [...new Set(out)]
}
