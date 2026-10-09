import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { PageFade, StatCard, LoadingButton, CopyButton, EmptyState } from '../components/ui'

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

  const licensed = !!status?.licensed
  const trialLeft = status?.trialDaysLeft

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · HWID handshake · server activate · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy}>Refresh</button>
      </div>

      {!licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <strong>{trialLeft != null && trialLeft <= 0 ? 'Trial ended' : 'Trial / unlicensed workspace'}</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Copy your HWID below, send it to your vendor, then run <strong>Activate on server</strong> once they approve.
            Default server: <code>{SA_CONFIG.defaultLicenseServerUrl}</code>
          </p>
        </div>
      )}

      {licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>Licensed</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            This device is activated. Keep a backup from Settings → Backup in case you move machines.
          </p>
        </div>
      )}

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard
          label="Status"
          value={licensed ? 'Licensed' : 'Trial'}
          tone={licensed ? 'good' : 'warn'}
        />
        <StatCard
          label="Trial days left"
          value={trialLeft ?? '—'}
          tone={trialLeft != null && trialLeft <= 7 ? 'bad' : undefined}
        />
        <StatCard
          label="Handshake"
          value={status?.handshakeOk ? 'OK' : 'Pending'}
          tone={status?.handshakeOk ? 'good' : 'warn'}
        />
        <StatCard label="Connectivity" value={online ? 'Online' : 'Offline'} tone={online ? 'good' : 'warn'} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Activation steps</h3>
        <ol style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem' }}>
          <li>Confirm license server URL (or use the default).</li>
          <li>Copy your <strong>Hardware ID</strong> and send it to the seller / admin.</li>
          <li>When approved, click <strong>Activate on server</strong> (requires network).</li>
          <li>Optional: <em>Handshake only</em> to test connectivity without activating.</li>
        </ol>
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
          Server must expose <code>/api/request-license</code> and <code>/api/activate</code>
          (see <code>license_server.py</code> / <code>license_routes_v24.py</code>).
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
