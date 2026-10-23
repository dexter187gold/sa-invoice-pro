import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageFade, formatDateZA, relativeTime } from '../components/ui'
import { runHealthCheck, formatHealth, offlineQueueSize, lastSyncAt } from '../lib/syncHealth'
import { Sync } from '../lib/sync'
import { SA_CONFIG, APP_VERSION } from '../config'
import { useApp } from '../context/AppContext'

export default function SyncHealth() {
  const { toast, refresh } = useApp()
  const [health, setHealth] = useState(null)
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState(() => (typeof Sync.getMeta === 'function' ? Sync.getMeta() : {}))

  const refreshHealth = async () => {
    setBusy(true)
    try {
      const h = await runHealthCheck()
      setHealth(h)
      if (typeof Sync.getMeta === 'function') setMeta(Sync.getMeta())
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    refreshHealth()
    const t = setInterval(refreshHealth, 30000)
    return () => clearInterval(t)
  }, [])

  const forceSync = async () => {
    setBusy(true)
    try {
      if (!Sync.isLoggedIn?.()) {
        toast?.('Log in under Settings → Cloud first', 'error')
        return
      }
      const { ensureWorkspaceSynced, describeEnsureResult } = await import('../lib/workspaceSync')
      const r = await ensureWorkspaceSynced({ forcePush: true })
      await refresh?.()
      toast?.(describeEnsureResult?.(r) || 'Sync complete', 'success')
      await refreshHealth()
    } catch (e) {
      toast?.(e?.message || 'Sync failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Sync health</h1>
          <p className="subtitle">Cloud · queue · last push · v{APP_VERSION}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={refreshHealth} disabled={busy}>
            {busy ? 'Checking…' : 'Refresh'}
          </button>
          <button type="button" className="btn btn-primary" onClick={forceSync} disabled={busy}>
            Force push / pull
          </button>
          <Link className="btn btn-outline" to="/settings">Cloud settings</Link>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <div className="label">Status</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{health ? formatHealth(health) : '…'}</div>
        </div>
        <div className="card">
          <div className="label">Offline queue</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{health?.queue ?? offlineQueueSize()}</div>
        </div>
        <div className="card">
          <div className="label">Last sync</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {health?.lastSync || lastSyncAt() ? relativeTime(health?.lastSync || lastSyncAt()) : 'Never'}
          </div>
        </div>
        <div className="card">
          <div className="label">Browser</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Server</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Endpoint: <code>{SA_CONFIG.syncServerUrl || '—'}</code>
        </p>
        {health && (
          <ul style={{ marginBottom: 0 }}>
            <li>HTTP: {health.ok ? `OK (${health.status})` : `Fail · ${health.reason || health.status || 'error'}`}</li>
            <li>Latency: {health.latencyMs != null ? `${health.latencyMs} ms` : '—'}</li>
            <li>Checked: {formatDateZA(health.at)}</li>
          </ul>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Session</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>Logged in: {Sync.isLoggedIn?.() ? 'Yes' : 'No'}</li>
          <li>User: {meta?.email || meta?.userEmail || '—'}</li>
        </ul>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Tip: after login on a new device, open this page and tap <strong>Force push / pull</strong> once
          so the workspace snapshot is restored.
        </p>
      </div>
    </PageFade>
  )
}
