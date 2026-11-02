import React from 'react'
import { CATALOG_PACKS, packsForBusiness } from '../lib/installCatalogPacks'

/** Renders Install … pack buttons for the current business type */
export default function CatalogPackButtons({ biz, refresh, toast }) {
  const keys = packsForBusiness(biz)
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
    <>
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
    </>
  )
}
