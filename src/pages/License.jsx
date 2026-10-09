import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { PageFade, StatCard, LoadingButton, CopyButton } from '../components/ui'

export default function License() {
  const { toast, online } = useApp()
  const [status, setStatus] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState(null)

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

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · handshake then server activate · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy}>Refresh</button>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard
          label="Licensed"
          value={status?.licensed ? 'Yes' : 'Trial'}
          tone={status?.licensed ? 'good' : 'warn'}
        />
        <StatCard
          label="Trial days left"
          value={status?.trialDaysLeft ?? '—'}
          tone={status?.trialDaysLeft != null && status.trialDaysLeft <= 7 ? 'bad' : undefined}
        />
        <StatCard
          label="Handshake"
          value={status?.handshakeOk ? 'OK' : 'Pending'}
          tone={status?.handshakeOk ? 'good' : 'warn'}
        />
        <StatCard label="Connectivity" value={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </div>

      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">License server URL</label>
          <input
            className="input"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder={SA_CONFIG.defaultLicenseServerUrl}
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={saveUrl}>Save URL</button>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Deploy <code>license_routes_v24.py</code> on the server so <code>/api/request-license</code> and{' '}
          <code>/api/activate</code> are recorded.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="label">Hardware ID (HWID)</div>
            <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{status?.hwid || '…'}</code>
          </div>
          {status?.hwid ? <CopyButton text={status.hwid} label="Copy HWID" /> : null}
        </div>
        {status?.meta && (
          <pre style={{ fontSize: 12, overflow: 'auto', marginTop: 12, marginBottom: 0, background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(status.meta, null, 2)}
          </pre>
        )}
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
      </div>

      {log && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Last server reply</h3>
          <pre style={{ fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0, background: 'var(--bg)', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      )}
    </PageFade>
  )
}
