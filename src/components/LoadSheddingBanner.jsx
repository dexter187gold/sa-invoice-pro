import React, { useEffect, useState } from 'react'
import { isLoadSheddingMode, setLoadSheddingMode } from '../lib/loadShedding'

export default function LoadSheddingBanner() {
  const [on, setOn] = useState(() => isLoadSheddingMode())
  useEffect(() => {
    const fn = (e) => setOn(!!e.detail?.on)
    window.addEventListener('sa-load-shedding', fn)
    return () => window.removeEventListener('sa-load-shedding', fn)
  }, [])
  if (!on) return null
  return (
    <div role="status" style={{
      background: 'linear-gradient(90deg,#422006,#713f12)', color: '#fef3c7',
      padding: '8px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    }}>
      <span>⚡ Load-shedding mode — offline-first; cloud sync deferred until power/data is stable.</span>
      <button type="button" className="btn btn-sm" style={{ background: '#fbbf24', color: '#422006' }}
        onClick={() => { setLoadSheddingMode(false); setOn(false) }}>
        Turn off
      </button>
    </div>
  )
}
