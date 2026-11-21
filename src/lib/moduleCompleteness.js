/**
 * SME business modules — 100% completeness score against registry + packs.
 */
import { BUSINESS_TYPES } from './businessTypes.js'
import { MODULE_REGISTRY, smeModuleScoreboard } from './businessModules.js'
import { CATALOG_PACKS, TYPE_PACK_MAP, packsForBusiness } from './installCatalogPacks.js'

const VERTICAL_KEYS = [
  'retail', 'trades', 'automotive', 'consulting', 'hospitality', 'health_beauty',
  'medical', 'legal', 'agriculture', 'accounting', 'logistics', 'education',
  'manufacturing', 'property', 'security', 'cleaning', 'creative', 'nonprofit',
]

export function verticalRegistryComplete() {
  const missing = VERTICAL_KEYS.filter((k) => !MODULE_REGISTRY[k] || MODULE_REGISTRY[k].status !== 'stable')
  return { ok: missing.length === 0, missing }
}

export function catalogPacksComplete() {
  const missing = VERTICAL_KEYS.filter((k) => !CATALOG_PACKS[k])
  return { ok: missing.length === 0, missing }
}

export function typePackMapComplete() {
  const types = (BUSINESS_TYPES || []).filter((t) => t.id !== 'other')
  const missing = []
  for (const t of types) {
    if (TYPE_PACK_MAP[t.id] === undefined) missing.push(t.id)
    else if (TYPE_PACK_MAP[t.id].length && !packsForBusiness(t).length) missing.push(t.id)
  }
  return { ok: missing.length === 0, missing }
}

export function smeModulesCompletion() {
  const reg = verticalRegistryComplete()
  const packs = catalogPacksComplete()
  const map = typePackMapComplete()
  const board = smeModuleScoreboard()
  const stable = board._summary?.stable ?? 0
  const total = board._summary?.total ?? 20
  const checks = [
    { id: 'registry', ok: reg.ok, detail: reg.missing },
    { id: 'catalog_packs', ok: packs.ok, detail: packs.missing },
    { id: 'type_pack_map', ok: map.ok, detail: map.missing },
    { id: 'scoreboard_stable', ok: stable >= total, detail: { stable, total } },
  ]
  const passed = checks.filter((c) => c.ok).length
  return {
    percent: Math.round((passed / checks.length) * 100),
    complete: passed === checks.length,
    checks,
    scoreboard: board,
  }
}
