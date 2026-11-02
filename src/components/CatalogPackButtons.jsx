import React from 'react'
import { CATALOG_PACKS, packsForBusiness } from '../lib/installCatalogPacks'

/** Install buttons for the current business type only (never other verticals). */
export default function CatalogPackButtons({ biz, refresh, toast }) {
  const keys = packsForBusiness(biz)
  if (!keys.length) {
    return (
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        No catalog pack for this business type. Add products and services manually, or change type under Settings → Company.
      </p>
    )
  }
  const run = async (key) => {
    const pack = CATALOG_PACKS[key]
    if (!pack) return
    try {
      const n = await pack.run()
      await refresh?.()
      toast?.(`Installed ${pack.label} · ${n} items`, 'success')
    } catch (e) {
      toast?.(e?.message || 'Install failed', 'error')
    }
  }
  return (
    <div className="catalog-pack-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="btn btn-secondary"
          onClick={() => run(key)}
        >
          Install {CATALOG_PACKS[key].label}
        </button>
      ))}
    </div>
  )
}
