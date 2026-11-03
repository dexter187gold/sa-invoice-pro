import React from 'react'

const STATUS_URL = 'https://saip-sync.onrender.com/api/system/status'

export default function MaintenanceBanner() {
  const [status, setStatus] = React.useState(null)
  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout?.(8000) })
        if (!response.ok) return
        const data = await response.json()
        if (alive) setStatus(data?.status || null)
      } catch { /* keep last known public status while offline */ }
    }
    load()
    const timer = window.setInterval(load, 60000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])
  if (!status?.maintenance?.enabled) return null
  return <div role="status" aria-live="polite" style={{
    position: 'fixed', zIndex: 10000, top: 0, left: 0, right: 0,
    padding: '10px 16px', background: '#78350f', color: '#fff',
    textAlign: 'center', fontSize: 13, fontWeight: 650,
    boxShadow: '0 2px 12px #0003',
  }}>
    <span style={{ marginRight: 8 }}>⚠ Maintenance notice:</span>
    {status.maintenance.message || 'SA Invoice Pro is undergoing scheduled maintenance.'}
  </div>
}
