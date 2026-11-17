import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getLastSyncAt, formatLastSync } from '../lib/connectivity'

export default function OfflineBanner() {
  const { online } = useApp() || {}
  const [last, setLast] = useState(() => getLastSyncAt())

  useEffect(() => {
    const tick = () => setLast(getLastSyncAt())
    tick()
    const id = setInterval(tick, 30000)
    window.addEventListener('saip-sync-state', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('saip-sync-state', tick)
    }
  }, [])

  if (online !== false) return null

  return (
    <div
      role="status"
      style={{
        background: '#422006',
        color: '#fde68a',
        padding: '8px 12px',
        fontSize: 13,
        textAlign: 'center',
        borderBottom: '1px solid #78350f',
      }}
    >
      You are offline. Desk keeps working on this device · {formatLastSync(last)}
    </div>
  )
}
