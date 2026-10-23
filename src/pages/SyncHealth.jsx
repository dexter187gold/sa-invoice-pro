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

  const git = health?.git
  const gitLabel = !git
    ? '—'
    : git.enabled
      ? `On · ${git.lastCommit || 'no commit yet'}`
      : 'Off (set GIT_DATA_* on Render)'

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Sync health</h1>
          <p className="subtitle">Cloud · queue · git store · v{APP_VERSION}</p>
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
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {health ? formatHealth(health) : '…'}
          </div>
        </div>
        <div className="card">
          <div className="label">Offline queue</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{health?.queue ?? offlineQueueSize()}</div>
        </div>
        <div className="card">
          <div className="label">Last sync</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {health?.lastSync || lastSyncAt()
              ? relativeTime(health?.lastSync || lastSyncAt())
              : 'Never'}
          </div>
        </div>
        <div className="card">
          <div className="label">Git store</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {gitLabel}
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
            <li>Version: {health.version || '—'}</li>
            <li>Latency: {health.latencyMs != null ? `${health.latencyMs} ms` : '—'}</li>
            <li>Cloud users on server: {health.users != null ? health.users : '—'}</li>
            <li>Checked: {formatDateZA(health.at)} {health.at ? relativeTime(health.at) : ''}</li>
          </ul>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Git durability (survives Render disk wipe)</h3>
        {!git ? (
          <p className="muted">No git status from server yet — refresh after deploy.</p>
        ) : (
          <ul style={{ marginBottom: 0 }}>
            <li>
              Enabled:{' '}
              <strong style={{ color: git.enabled ? 'var(--green, #16a34a)' : 'var(--danger, #dc2626)' }}>
                {git.enabled ? 'Yes' : 'No'}
              </strong>
            </li>
            <li>Last pull: {git.lastPullAt ? `${formatDateZA(git.lastPullAt)} · ${relativeTime(git.lastPullAt)}` : '—'}</li>
            <li>Last push: {git.lastPushAt ? `${formatDateZA(git.lastPushAt)} · ${relativeTime(git.lastPushAt)}` : '—'}</li>
            <li>Commit: {git.lastCommit || '—'}</li>
            <li>Pulls / pushes: {git.pulls ?? 0} / {git.pushes ?? 0}</li>
            {git.error ? <li className="text-danger">Error: {String(git.error).slice(0, 200)}</li> : null}
          </ul>
        )}
        {!git?.enabled && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            On Render → Environment, set <code>GIT_DATA_ENABLED=true</code>,{' '}
            <code>GIT_DATA_REPO=https://github.com/dexter187gold/saip-sync-data.git</code>, and a fine-grained{' '}
            <code>GIT_DATA_TOKEN</code> with Contents write on <code>saip-sync-data</code>, then redeploy.
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Session</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>Logged in: {Sync.isLoggedIn?.() ? 'Yes' : 'No'}</li>
          <li>User: {meta?.email || meta?.userEmail || '—'}</li>
          <li>Token present: {meta?.hasToken || (typeof Sync.getToken === 'function' && Sync.getToken()) ? 'Yes' : 'No'}</li>
        </ul>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Tip: on the device that still has your data, tap <strong>Force push / pull</strong> once so the
          workspace is uploaded. Then any other device can log in and restore automatically (every 5 min + on boot).
        </p>
      </div>
    </PageFade>
  )
}
