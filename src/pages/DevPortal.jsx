import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageFade, StatCard } from '../components/ui'
import {
  loadDevConfig, saveDevConfig, resetDevConfig, DEFAULT_ENDPOINTS, RENDER_SECRET_CHECKLIST, getEndpoint,
} from '../lib/devConfig'
import { loadSecrets, saveSecrets, clearSecrets, SECRET_FIELDS, secretsToEnvSnippet } from '../lib/devSecrets'
import { isDevPortalAuthed, loginDevPortal, logoutDevPortal, getDevUsername } from '../lib/devAuth'
import { APP_VERSION, APP_LINKS } from '../config'

const URL_FIELDS = [
  { key: 'syncServer', label: 'Sync / cloud API (saip-sync)', hint: 'Auth, workspace, portal write-back' },
  { key: 'licenseServer', label: 'License server', hint: 'Handshake · activate · admin' },
  { key: 'updatesServer', label: 'Updates server', hint: 'Desktop / APK update channel' },
  { key: 'deskAppUrl', label: 'Desk app public URL', hint: 'Cloudflare Pages / Workers hostname' },
  { key: 'clientPortalUrl', label: 'Standalone client portal URL', hint: 'workers.dev or custom domain' },
  { key: 'websiteUrl', label: 'Marketing website', hint: 'Pricing / PayFast return pages' },
]

function DevLogin({ onOk }) {
  const [username, setUsername] = useState(() => getDevUsername())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await loginDevPortal(username, password)
      onOk()
    } catch (ex) {
      setErr(ex?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page" style={{ minHeight: '100vh' }}>
      <div className="auth-card" style={{ maxWidth: 420, margin: '10vh auto' }}>
        <h1 style={{ marginTop: 0 }}>Developer portal</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          Restricted. Product ops for SA Invoice Pro — not for shop staff.
        </p>
        <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Developer username</span>
            <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Password</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {err ? <p style={{ color: 'var(--danger, #b91c1c)', margin: 0, fontSize: 13 }}>{err}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Checking…' : 'Unlock developer portal'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          <Link to="/login">← Back to shop login</Link>
        </p>
      </div>
    </div>
  )
}

export default function DevPortal() {
  const [authed, setAuthed] = useState(() => isDevPortalAuthed())
  const [form, setForm] = useState(() => loadDevConfig())
  const [secrets, setSecrets] = useState(() => loadSecrets())
  const [showSecrets, setShowSecrets] = useState(false)
  const [health, setHealth] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (authed) {
      setForm(loadDevConfig())
      setSecrets(loadSecrets())
    }
  }, [authed])

  const groups = useMemo(() => {
    const g = {}
    for (const f of SECRET_FIELDS) {
      ;(g[f.group] || (g[f.group] = [])).push(f)
    }
    return g
  }, [])

  if (!authed) return <DevLogin onOk={() => setAuthed(true)} />

  const toast = (t) => setMsg(t)

  const probeSync = async () => {
    setBusy(true)
    try {
      const base = getEndpoint('syncServer')
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout?.(12000) })
      const data = await res.json().catch(() => ({}))
      setHealth({ ok: res.ok, status: res.status, data, base })
      toast(res.ok ? 'Sync health OK' : 'Sync health failed')
    } catch (e) {
      setHealth({ ok: false, error: e?.message || String(e), base: getEndpoint('syncServer') })
      toast(e?.message || 'Health probe failed')
    } finally {
      setBusy(false)
    }
  }

  const saveUrls = (e) => {
    e?.preventDefault?.()
    try {
      setForm(saveDevConfig(form))
      toast('Public endpoints saved on this device')
    } catch (err) {
      toast(err?.message || 'Save failed')
    }
  }

  const saveVault = (e) => {
    e?.preventDefault?.()
    try {
      setSecrets(saveSecrets(secrets))
      toast('Secrets vault saved on this device only')
    } catch (err) {
      toast(err?.message || 'Vault save failed')
    }
  }

  const copyEnv = async () => {
    const snip = secretsToEnvSnippet(secrets)
    if (!snip) {
      toast('No secret values to export')
      return
    }
    try {
      await navigator.clipboard.writeText(snip)
      toast('Env snippet copied — paste into Render dashboard')
    } catch {
      toast('Could not copy — select and copy manually')
    }
  }

  const lock = () => {
    logoutDevPortal()
    setAuthed(false)
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Developer portal</h1>
          <p className="subtitle">Endpoints · secrets vault · health · v{APP_VERSION}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={probeSync}>Probe sync</button>
          <button type="button" className="btn btn-outline" onClick={lock}>Lock portal</button>
          <Link className="btn btn-outline" to="/">Desk home</Link>
        </div>
      </div>

      {msg ? <p className="muted" style={{ fontSize: 13 }}>{msg}</p> : null}

      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--warning, #ca8a04)' }}>
        <strong>Security note</strong>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Secrets stay in <strong>this browser only</strong> (obfuscated). Not uploaded to GitHub.
          Production still needs the same values in <strong>Render → Environment</strong>.
          Use <em>Copy env snippet</em> then paste into Render.
        </p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard label="Sync base" value={(form.syncServer || '').replace(/^https?:\/\//, '') || '—'} />
        <StatCard label="Health" value={health ? (health.ok ? 'OK' : 'Fail') : '—'} hint={health?.status ? `HTTP ${health.status}` : health?.error} />
        <StatCard label="Product email" value={APP_LINKS.productEmail || 'sainvoicepro@gmail.com'} />
      </div>

      <form className="card form-grid" onSubmit={saveUrls} style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Public service URLs</h3>
        {URL_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input className="input" value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={DEFAULT_ENDPOINTS[f.key] || 'https://…'} />
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{f.hint}</p>
          </div>
        ))}
        <div>
          <label className="label">Operator notes</label>
          <textarea className="input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">Save URLs</button>
          <button type="button" className="btn btn-outline" onClick={() => setForm(resetDevConfig())}>Reset URL defaults</button>
        </div>
      </form>

      <form className="card form-grid" onSubmit={saveVault} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Secrets vault</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowSecrets((v) => !v)}>
            {showSecrets ? 'Hide values' : 'Show values'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          PayFast · JWT · Meta/WhatsApp · Google · Render API · more.
        </p>
        {Object.entries(groups).map(([group, fields]) => (
          <div key={group} style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '8px 0' }}>{group}</h4>
            <div className="form-grid">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input"
                    type={showSecrets || !f.secret ? 'text' : 'password'}
                    autoComplete="off"
                    value={secrets[f.key] || ''}
                    onChange={(e) => setSecrets({ ...secrets, [f.key]: e.target.value })}
                    placeholder={f.secret ? '••••••••' : ''}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">Save secrets vault</button>
          <button type="button" className="btn btn-outline" onClick={copyEnv}>Copy env snippet</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              if (window.confirm('Clear all secrets from this browser?')) {
                clearSecrets()
                setSecrets(loadSecrets())
                toast('Secrets cleared on this device')
              }
            }}
          >
            Clear vault
          </button>
        </div>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Render services checklist</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {RENDER_SECRET_CHECKLIST.map((row) => (
            <li key={row.service} style={{ marginBottom: 8 }}>
              <strong>{row.service}</strong>: {row.keys.join(', ')}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Quick links</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <a href={getEndpoint('syncServer') + '/health'} target="_blank" rel="noreferrer">Sync health</a>
          <a href={getEndpoint('licenseServer')} target="_blank" rel="noreferrer">License dashboard</a>
          <a href={getEndpoint('licenseServer') + '/admin'} target="_blank" rel="noreferrer">License admin</a>
          <a href={getEndpoint('updatesServer')} target="_blank" rel="noreferrer">Updates server</a>
          <a href="https://dashboard.render.com/" target="_blank" rel="noreferrer">Render dashboard</a>
          <a href="https://github.com/dexter187gold/sa-invoice-pro" target="_blank" rel="noreferrer">Desk repo</a>
        </div>
      </div>
    </PageFade>
  )
}
