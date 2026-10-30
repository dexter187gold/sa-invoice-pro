import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PageFade, StatCard } from '../components/ui'
import {
  loadDevConfig, saveDevConfig, resetDevConfig, DEFAULT_ENDPOINTS, RENDER_SECRET_CHECKLIST, getEndpoint,
} from '../lib/devConfig'
import { APP_VERSION, APP_LINKS } from '../config'

const FIELDS = [
  { key: 'syncServer', label: 'Sync / cloud API (saip-sync)', hint: 'Auth, workspace, portal write-back' },
  { key: 'licenseServer', label: 'License server', hint: 'Handshake · activate · admin' },
  { key: 'updatesServer', label: 'Updates server', hint: 'Desktop / APK update channel' },
  { key: 'deskAppUrl', label: 'Desk app public URL', hint: 'Cloudflare Pages / Workers hostname' },
  { key: 'clientPortalUrl', label: 'Standalone client portal URL', hint: 'workers.dev or custom domain' },
  { key: 'websiteUrl', label: 'Marketing website', hint: 'Pricing / PayFast return pages' },
]

export default function DevPortal() {
  const { toast } = useApp() || {}
  const [form, setForm] = useState(() => loadDevConfig())
  const [health, setHealth] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setForm(loadDevConfig())
  }, [])

  const probeSync = async () => {
    setBusy(true)
    try {
      const base = getEndpoint('syncServer')
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout?.(12000) })
      const data = await res.json().catch(() => ({}))
      setHealth({ ok: res.ok, status: res.status, data, base })
      toast?.(res.ok ? 'Sync health OK' : 'Sync health failed', res.ok ? 'success' : 'error')
    } catch (e) {
      setHealth({ ok: false, error: e?.message || String(e), base: getEndpoint('syncServer') })
      toast?.(e?.message || 'Health probe failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const save = (e) => {
    e?.preventDefault?.()
    try {
      const next = saveDevConfig(form)
      setForm(next)
      toast?.('Developer endpoints saved on this device', 'success')
    } catch (err) {
      toast?.(err?.message || 'Save failed', 'error')
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Developer portal</h1>
          <p className="subtitle">Endpoints · health · ops checklist · v{APP_VERSION}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={probeSync}>Probe sync health</button>
          <Link className="btn btn-outline" to="/owner-console">Owner centre</Link>
          <Link className="btn btn-outline" to="/settings">Settings</Link>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard label="Sync base" value={form.syncServer?.replace(/^https?:\/\//, '') || '—'} />
        <StatCard label="Health" value={health ? (health.ok ? 'OK' : 'Fail') : '—'} hint={health?.status ? `HTTP ${health.status}` : health?.error} />
        <StatCard label="Product email" value={APP_LINKS.productEmail || 'sainvoicepro@gmail.com'} />
      </div>

      <form className="card form-grid" onSubmit={save} style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Public service URLs</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          These overrides are stored in <strong>this browser only</strong> and used by the desk for API base URLs.
          Do <strong>not</strong> paste merchant keys, JWT secrets, or Meta tokens here — set those on Render.
        </p>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              value={form[f.key] || ''}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={DEFAULT_ENDPOINTS[f.key] || 'https://…'}
            />
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{f.hint}</p>
          </div>
        ))}
        <div>
          <label className="label">Operator notes</label>
          <textarea className="input" rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Staging slot, beta cohort, …" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">Save endpoints</button>
          <button type="button" className="btn btn-outline" onClick={() => { setForm(resetDevConfig()); toast?.('Reset to defaults', 'info') }}>Reset defaults</button>
        </div>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Secrets live on Render (not in the app)</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Controlling secrets from a public SPA would expose them. Use the Render dashboard (or API) for env vars.
          Checklist:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {RENDER_SECRET_CHECKLIST.map((row) => (
            <li key={row.service} style={{ marginBottom: 8 }}>
              <strong>{row.service}</strong>: {row.keys.join(', ')}
            </li>
          ))}
        </ul>
        <p className="muted" style={{ fontSize: 12 }}>
          Product email only: <strong>sainvoicepro@gmail.com</strong>
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Quick links</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <a href={getEndpoint('syncServer') + '/health'} target="_blank" rel="noreferrer">Sync health</a>
          <a href={getEndpoint('licenseServer')} target="_blank" rel="noreferrer">License dashboard</a>
          <a href={getEndpoint('licenseServer') + '/admin'} target="_blank" rel="noreferrer">License admin</a>
          <a href={getEndpoint('updatesServer')} target="_blank" rel="noreferrer">Updates server</a>
          <a href="https://github.com/dexter187gold/sa-invoice-pro" target="_blank" rel="noreferrer">Desk repo</a>
          <a href="https://github.com/dexter187gold/saip-sync" target="_blank" rel="noreferrer">Sync repo</a>
          <Link to="/docs-links">In-app links doc</Link>
        </div>
      </div>
    </PageFade>
  )
}
