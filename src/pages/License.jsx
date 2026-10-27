import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as licenseApi from '../lib/license'
import * as billing from '../lib/billing'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG, APP_LINKS } from '../config'
import { TIERS } from '../lib/licenseTiers'
import { PageFade, StatCard, LoadingButton, CopyButton, EmptyState } from '../components/ui'

export default function License() {
  const { toast, online } = useApp()
  const [params] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [serverUrl, setServerUrl] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState(null)
  const [ping, setPing] = useState(null)

  const reload = async () => {
    const s = await licenseApi.getLicenseStatus()
    setStatus(s)
    setServerUrl(await licenseApi.getServerUrl())
    setLog(s.exchange || null)
    const em = await billing.getLicenseEmail()
    if (em) setEmail(em)
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    if (params.get('paid') === '1') {
      toast('Payment return — click Claim paid license if not activated yet', 'info')
    }
  }, [params, toast])

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

  const buy = async (planId) => {
    setBusy(true)
    try {
      await billing.buyPlan(planId, email)
      // page navigates to PayFast
    } catch (e) {
      toast(e.message || String(e), 'error')
      setLog({ error: e.message, details: e.details })
      setBusy(false)
    }
  }

  const claim = async () => {
    await run(() => billing.claimPaidLicense(email), 'Paid license claimed')
  }

  const licensed = !!status?.licensed
  const trialLeft = status?.trialDaysLeft

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>License</h1>
          <p className="subtitle">
            {online ? 'Online' : 'Offline'} · Pay → auto seats on email · v{APP_VERSION}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={reload} disabled={busy}>Refresh</button>
      </div>

      <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #38bdf8' }}>
        <strong>Self-serve licensing</strong>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
          Buy a plan → PayFast → seats attach to your <strong>email</strong> (not IP or MAC).
          Soft device id only counts seats after claim. Admin:{" '"}
          <a href={APP_LINKS.licenseAdmin} target="_blank" rel="noreferrer">/admin</a>
          {" "}(PayFast merchant keys).
        </p>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <div>
          <label className="label">License email (account owner)</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@shop.co.za"
          />
        </div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Use the same email at checkout. After payment, click <strong>Claim paid license</strong>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Buy a plan</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
          {TIERS.map((t) => (
            <div
              key={t.id}
              style={{
                border: t.recommended ? '2px solid var(--green,#22c55e)' : '1px solid var(--border,rgba(255,255,255,.12))',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <strong>{t.name}</strong>
              <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>{t.priceHint}</div>
              <ul style={{ margin: '0 0 10px', paddingLeft: 16, fontSize: 12 }}>
                {t.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
                disabled={busy || !email.includes('@')}
                onClick={() => buy(t.id)}
              >
                Buy {t.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {!licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <strong>{trialLeft != null && trialLeft <= 0 ? 'Trial ended (soft)' : 'Trial / unlicensed workspace'}</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Alpha soft mode keeps the desk open. Pay when ready — no manual approve on the server.
          </p>
        </div>
      )}

      {licensed && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>Licensed</strong>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>This device is activated against a paid/issued key.</p>
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
          <strong>Ping:</strong> {ping.ok ? `OK · ${ping.base}` : `${ping.error || 'failed'} · ${ping.base || ''}`}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div className="label">Soft device id (seat binding only)</div>
            <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{status?.hwid || '…'}</code>
          </div>
          {status?.hwid ? <CopyButton text={status.hwid} label="Copy id" /> : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <LoadingButton loading={busy} onClick={claim}>
          Claim paid license
        </LoadingButton>
        <LoadingButton loading={busy} onClick={() => run(() => licenseApi.fullActivate(), 'Legacy activate')}>
          Legacy activate
        </LoadingButton>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => licenseApi.handshake(), 'Handshake OK')}>
          Handshake
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

      {!status && <EmptyState title="Loading license status…" hint="If this hangs, check network and server URL." />}
    </PageFade>
  )
}
