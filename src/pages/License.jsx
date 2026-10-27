import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG, APP_LINKS } from '../config'
import { TIERS } from '../lib/licenseTiers'
import { PageFade, StatCard, LoadingButton, CopyButton, EmptyState } from '../components/ui'

export default function License() {
  const { toast, online } = useApp()
  const [status, setStatus] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState(null)
  const [ping, setPing] = useState(null)

  const reload = async () => {
    const s = await licenseApi.getLicenseStatus()
    setStatus(s)
    setServerUrl(await licenseApi.getServerUrl())
    setLog(s.exchange || null)
  }

  useEffect(() => { reload() }, [])

  const saveUrl = async () => {
    await db.setSetting('licenseServerUrl', serverUrl.trim().replace(/\/$/, ''))
    toast('Server URL saved', 'success')
    await reload()
  }

  const run = async (fn, label) => {
    setBusy(true)
    try {
      const out = await fn()
      setLog(out)
      toast(label, 'success')
      await reload()
    } catch (e) {
      toast(e.message || String(e), 'error')
      setLog({ error: e.message, details: e.details })
    } finally {
      setBusy(false)
    }
  }

  const doPing = async () => {
    setBusy(true)
    try {
      const r = await licenseApi.pingLicenseServer()
      setPing(r)
      toast(r.ok ? 'License server reachable' : (r.error || 'Server not reachable'), r.ok ? 'success' : 'error')
    } finally {
      setBusy(false)
    }
  }

  const licensed = !!status?.licensed
  const trialLeft = status?.trialDaysLeft

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · HWID handshake · 30-day soft alpha · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy}>Refresh</button>
      </div>

      <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #38bdf8' }}>
        <strong>Alpha soft mode</strong>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
          Desk stays fully usable for the free-tier window. Handshake → Request → approve on the{' '}
          <a href={APP_LINKS.licenseDashboard} target="_blank" rel="noreferrer">license dashboard</a>
          {' '}→ Activate. Admin config: {' '}
          <a href={APP_LINKS.licenseAdmin} target="_blank" rel="noreferrer">/admin</a>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>License tiers</h3>
        <p className="muted" style={{ fontSize: 13 }}>Product packaging for IT workshops — pick the plan that matches your shop.</p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
          {TIERS.map((t) => (
            <div key={t.id} style={{ border: t.recommended ? '2px solid var(--green,#22c55e)' : '1px solid var(--border,rgba(255,255,255,.12))', borderRadius: 12, padding: 12 }}>
              <strong>{t.name}</strong>
              <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>{t.priceHint}</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                {t.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {!licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <strong>{trialLeft != null && trialLeft <= 0 ? 'Trial ended (soft)' : 'Trial / unlicensed workspace'}</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Copy your HWID below, or use <strong>Activate on server</strong> after the vendor issues a key on the dashboard.
          </p>
        </div>
      )}

      {licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>Licensed</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            This device is activated. Keep a backup from Settings.
          </p>
        </div>
      )}

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Status" value={licensed ? 'Licensed' : 'Soft trial'} tone={licensed ? 'good' : 'warn'} />
        <StatCard label="Trial days left" value={trialLeft ?? '—'} tone={trialLeft != null && trialLeft <= 7 ? 'bad' : undefined} />
        <StatCard label="Handshake" value={status?.handshakeOk ? 'OK' : 'Pending'} tone={status?.handshakeOk ? 'good' : 'warn'} />
        <StatCard label="Connectivity" value={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </div>

      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">License server URL</label>
          <input className="input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder={SA_CONFIG.defaultLicenseServerUrl} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={saveUrl}>Save URL</button>
        <button type="button" className="btn btn-outline" onClick={doPing} disabled={busy}>Ping server</button>
      </div>

      {ping && (
        <div className="card" style={{ marginBottom: 12, fontSize: 13 }}>
          <strong>Ping:</strong>{' '}
          {ping.ok ? `OK · ${ping.base}` : `${ping.error || 'failed'} · ${ping.base || ''}`}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="label">Hardware ID (HWID)</div>
            <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{status?.hwid || '…'}</code>
          </div>
          {status?.hwid ? <CopyButton text={status.hwid} label="Copy HWID" /> : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <LoadingButton loading={busy} onClick={() => run(() => licenseApi.fullActivate(), 'Server activated')}>
          Activate on server
        </LoadingButton>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => licenseApi.handshake(), 'Handshake OK')}>
          Handshake only
        </button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => licenseApi.requestLicense(), 'Request queued')}>
          Request only
        </button>
        <Link className="btn btn-outline" to="/settings">Settings / backup</Link>
      </div>

      {log && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Last server reply</h3>
          <pre style={{ fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0, background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      )}

      {!status && (
        <EmptyState title="Loading license status…" hint="If this hangs, check network and server URL." />
      )}
    </PageFade>
  )
}
