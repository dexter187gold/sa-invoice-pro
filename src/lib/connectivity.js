/** Connectivity + last sync helpers for offline banner. */
export function getLastSyncAt() {
  try {
    return localStorage.getItem('saip_last_sync_at') || ''
  } catch {
    return ''
  }
}

export function setLastSyncAt(iso) {
  const v = iso || new Date().toISOString()
  try {
    localStorage.setItem('saip_last_sync_at', v)
  } catch {}
  return v
}

export function formatLastSync(iso) {
  if (!iso) return 'Never synced on this device'
  try {
    const d = new Date(iso)
    const mins = Math.round((Date.now() - d.getTime()) / 60000)
    if (mins < 1) return 'Synced just now'
    if (mins < 60) return `Last sync ${mins} min ago`
    const hrs = Math.round(mins / 60)
    if (hrs < 48) return `Last sync ${hrs}h ago`
    return `Last sync ${d.toLocaleString()}`
  } catch {
    return 'Last sync unknown'
  }
}
