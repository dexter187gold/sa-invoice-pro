import React, { useEffect, useState } from 'react'
import { Sync } from '../lib/sync'
import * as db from '../lib/db'
import { STORES, importAll } from '../lib/db'
import { LoadingButton } from './ui'
import { useApp } from '../context/AppContext'
import {
  ensureWorkspaceSynced,
  describeEnsureResult,
  flushPushQueue,
  getWorkspaceSyncMeta,
} from '../lib/workspaceSync'

export default function CloudSettings({ toast }) {
  const { refresh, toast: appToast } = useApp()
  const notify = toast || appToast
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [status, setStatus] = useState(Sync.isLoggedIn() ? 'connected' : 'logged_out')
  const [userEmail, setUserEmail] = useState('')
  const [health, setHealth] = useState(null)
  const [meta, setMeta] = useState(() => getWorkspaceSyncMeta())
  const [lastMsg, setLastMsg] = useState('')

  const refreshStatus = async () => {
    setMeta(getWorkspaceSyncMeta())
    if (!Sync.isLoggedIn()) {
      setStatus('logged_out')
      setUserEmail('')
      return
    }
    try {
      const r = await Sync.me()
      setUserEmail(r.user?.email || '')
      setStatus('connected')
    } catch {
      // token may still be valid for workspace; keep connected if token exists
      if (Sync.isLoggedIn()) setStatus('connected')
      else setStatus('logged_out')
    }
    try {
      const h = await Sync.health()
      setHealth(h)
    } catch (e) {
      setHealth({ ok: false, error: e.message })
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const doLogin = async () => {
    setBusy(true)
    try {
      const r = await Sync.login(email.trim(), password)
      setUserEmail(r.user?.email || email)
      setStatus('connected')
      setPassword('')
      notify?.('Cloud login successful — pushing workspace…', 'success')
      try {
        await flushPushQueue()
        const result = await ensureWorkspaceSynced({ forcePush: true })
        setMeta(getWorkspaceSyncMeta())
        setLastMsg(describeEnsureResult(result))
        if (result?.ok) notify?.(describeEnsureResult(result), 'success')
        else notify?.(describeEnsureResult(result) || 'Sync queued', 'info')
        await refresh?.()
      } catch (e) {
        notify?.(e.message || 'Logged in; sync will retry', 'info')
      }
      await refreshStatus()
    } catch (e) {
      notify?.(e.message || 'Login failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doRegister = async () => {
    setBusy(true)
    try {
      const r = await Sync.register(email.trim(), password, name.trim() || undefined)
      setUserEmail(r.user?.email || email)
      setStatus('connected')
      setPassword('')
      notify?.('Cloud account created', 'success')
      try {
        const result = await ensureWorkspaceSynced({ forcePush: true })
        setLastMsg(describeEnsureResult(result))
        notify?.(describeEnsureResult(result), result?.ok ? 'success' : 'info')
        await refresh?.()
      } catch {}
      await refreshStatus()
    } catch (e) {
      notify?.(e.message || 'Register failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doLogout = () => {
    Sync.logout()
    setStatus('logged_out')
    setUserEmail('')
    setLastMsg('')
    notify?.('Logged out of cloud', 'success')
  }

  /** Full workspace push — clients, invoices, quotes, tickets, payments, stock, expenses, company */
  const pushWorkspace = async () => {
    if (!Sync.isLoggedIn()) return notify?.('Login to cloud first', 'error')
    setPushing(true)
    setLastMsg('')
    try {
      // Wake free-tier if sleeping
      try {
        await Sync.health()
      } catch {
        notify?.('Waking cloud server…', 'info')
        await new Promise((r) => setTimeout(r, 2500))
      }
      const flushed = await flushPushQueue()
      const result = await ensureWorkspaceSynced({ forcePush: true })
      setMeta(getWorkspaceSyncMeta())
      const msg = describeEnsureResult(result)
      setLastMsg(msg + (flushed?.flushed ? ` · flushed ${flushed.flushed} queued` : ''))
      if (result?.ok) {
        notify?.(msg || 'Workspace pushed to cloud', 'success')
        await refresh?.()
      } else {
        notify?.(msg || result?.reason || 'Push failed — will retry from queue', 'error')
      }
      await refreshStatus()
    } catch (e) {
      const m = e?.message || 'Push failed'
      setLastMsg(m)
      notify?.(m, 'error')
    } finally {
      setPushing(false)
    }
  }

  const pullCloudProfile = async () => {
    if (!Sync.isLoggedIn()) return notify?.('Login to the cloud account that owns this profile first', 'error')
    setPulling(true)
    try {
      const stores = [
        STORES.clients, STORES.invoices, STORES.quotes, STORES.tickets,
        STORES.payments, STORES.products, STORES.services, STORES.expenses,
      ]
      const counts = await Promise.all(stores.map(async (store) => (await db.getAll(store)).length))
      const localCount = counts.reduce((sum, n) => sum + n, 0)
      const localCompany = await db.getCompany()
      if ((localCount > 0 || localCompany) && typeof window !== 'undefined' &&
          !window.confirm(
            'This device already has local business data. Pulling will merge the cloud profile for ' +
            (userEmail || 'this account') +
            ' into this device. Continue?',
          )) return

      const result = await ensureWorkspaceSynced({ forcePush: false })
      if (result?.action === 'restore' || result?.action === 'merge') {
        await refresh?.()
        setLastMsg(describeEnsureResult(result))
        notify?.(describeEnsureResult(result), 'success')
      } else {
        // explicit pull path
        const row = await Sync.pull()
        const shape = Sync.workspaceToImportShape(row)
        if (!shape) {
          notify?.('The cloud account has no saved profile to restore yet. Use Push workspace first.', 'info')
          return
        }
        const stats = await importAll(shape, { wipe: false })
        await refresh?.()
        notify?.('Pulled cloud profile (' + stats.rows + ' records). Local records preserved where possible.', 'success')
      }
      setMeta(getWorkspaceSyncMeta())
      await refreshStatus()
    } catch (e) {
      const message = e?.message || 'Cloud profile could not be pulled'
      if (/No workspace|404/i.test(message)) {
        notify?.('No saved cloud profile yet — use Push workspace to upload this device.', 'info')
      } else {
        notify?.('Profile pull failed: ' + message, 'error')
      }
    } finally {
      setPulling(false)
    }
  }

  if (status === 'connected') {
    return (
      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Connected as <strong>{userEmail || 'cloud user'}</strong>.
          Push uploads this device workspace so other devices can pull it.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Server: {Sync.base}
          {health?.ok === true ? ' · online' : health?.ok === false ? ' · waking / check connection' : ''}
          {health?.version ? ` · API ${health.version}` : ''}
        </p>
        {meta?.action ? (
          <p className="muted" style={{ fontSize: 12 }}>
            Last sync: {meta.action}{meta.version != null ? ` · v${meta.version}` : ''}{meta.at ? ` · ${new Date(meta.at).toLocaleString()}` : ''}
          </p>
        ) : null}
        {lastMsg ? <p style={{ fontSize: 13, margin: 0 }}>{lastMsg}</p> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <LoadingButton loading={pushing} className="btn btn-primary" onClick={pushWorkspace}>
            {pushing ? 'Pushing…' : 'Push workspace to cloud'}
          </LoadingButton>
          <LoadingButton loading={pulling} className="btn btn-outline" onClick={pullCloudProfile}>
            {pulling ? 'Pulling…' : 'Pull / merge from cloud'}
          </LoadingButton>
          <button type="button" className="btn btn-outline" onClick={() => refreshStatus()}>
            Check status
          </button>
          <button type="button" className="btn btn-outline" onClick={doLogout}>
            Logout from cloud
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
          Tip: after major edits, use <strong>Push workspace to cloud</strong>. Free-tier Render may take ~20s to wake.
          Failed pushes are queued and retried on the next push.
        </p>
      </div>
    )
  }

  return (
    <div className="card form-grid">
      <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Sign in so this device can push and pull your full workspace (clients, invoices, quotes, tickets, payments, stock).
      </p>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars with letters + numbers" autoComplete="current-password" />
      </div>
      <div>
        <label className="label">Name (register only)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <LoadingButton loading={busy} onClick={doLogin}>Login</LoadingButton>
        <LoadingButton loading={busy} className="btn btn-secondary" onClick={doRegister}>Register</LoadingButton>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        <a href={`${Sync.base}/forgot-password`} target="_blank" rel="noreferrer">Forgot password?</a>
        {' · '}Same account on phone + desktop.
      </p>
    </div>
  )
}
