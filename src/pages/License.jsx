import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as LicenseApi from '../lib/license'
import * as db from '../lib/db'

export default function LicensePage() {
  const { toast, online } = useApp()
  const [status, setStatus] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setStatus(await LicenseApi.getLicenseStatus())
    setServerUrl(await LicenseApi.getServerUrl())
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
      await fn()
      toast(label, 'success')
      await reload()
    } catch (e) {
      toast(e.message || String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">{online ? 'Online' : 'Offline'} · HWID + server handshake</p>
        </div>
      </div>
      <div className="card form-grid" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">License server URL</label>
          <input className="input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://sa-invoice-license.onrender.com" />
        </div>
        <button type="button" className="btn btn-secondary" onClick={saveUrl}>Save URL</button>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p><strong>HWID:</strong> <code>{status?.hwid || '…'}</code></p>
        <p><strong>Licensed:</strong> {status?.licensed ? 'Yes' : 'No (trial)'}</p>
        <p><strong>Trial days left:</strong> {status?.trialDaysLeft}</p>
        <p><strong>Handshake:</strong> {status?.handshakeOk ? 'OK' : 'Not yet'}</p>
        {status?.meta && <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(status.meta, null, 2)}</pre>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => LicenseApi.handshake(), 'Handshake OK')}>1. Handshake</button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(() => LicenseApi.requestLicense(), 'License requested')}>2. Request + refresh</button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => LicenseApi.activate(), 'Activated')}>3. Activate</button>
        <button type="button" className="btn btn-outline" onClick={reload}>Refresh status</button>
      </div>
    </div>
  )
}
