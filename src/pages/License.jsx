import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as db from '../lib/db'

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
    <div>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">{online ? 'Online' : 'Offline'} · handshake then server activate</p>
        </div>
      </div>
      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">License server URL</label>
          <input className="input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://sa-invoice-license.onrender.com" />
        </div>
        <button type="button" className="btn btn-secondary" onClick={saveUrl}>Save URL</button>
        <p className="muted">Deploy license_routes_v24.py on the server so /api/request-license and /api/activate are recorded.</p>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p><strong>HWID:</strong> <code>{status?.hwid || '…'}</code></p>
        <p><strong>Licensed:</strong> {status?.licensed ? 'Yes' : 'No (trial)'}</p>
        <p><strong>Trial days left:</strong> {status?.trialDaysLeft}</p>
        <p><strong>Handshake:</strong> {status?.handshakeOk ? 'OK' : 'Not yet'}</p>
        {status?.meta && <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(status.meta, null, 2)}</pre>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => licenseApi.fullActivate(), 'Server activated')}>Activate on server</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => licenseApi.handshake(), 'Handshake OK')}>Handshake only</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => licenseApi.requestLicense(), 'Request queued')}>Request only</button>
        <button type="button" className="btn btn-outline" onClick={reload}>Refresh</button>
      </div>
      {log && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Last server reply</h3>
          <pre style={{ fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(log, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
