import React, { useEffect, useState } from 'react'
import { Sync } from '../lib/sync'
import * as db from '../lib/db'
import { STORES, importAll } from '../lib/db'
import { LoadingButton } from './ui'
import { useApp } from '../context/AppContext'

export default function CloudSettings({ toast }) {
  const { invoices, clients, refresh, toast: appToast } = useApp()
  const notify = toast || appToast
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [status, setStatus] = useState(Sync.isLoggedIn() ? 'connected' : 'logged_out')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!Sync.isLoggedIn()) return
    Sync.me()
      .then((r) => {
        setUserEmail(r.user?.email || '')
        setStatus('connected')
      })
      .catch(() => {
        Sync.logout()
        setStatus('logged_out')
      })
  }, [])

  const doLogin = async () => {
    setBusy(true)
    try {
      const r = await Sync.login(email.trim(), password)
      setUserEmail(r.user?.email || email)
      setStatus('connected')
      setPassword('')
      notify?.('Cloud login successful', 'success')
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
      notify?.('Cloud account created & logged in', 'success')
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
    notify?.('Logged out of cloud', 'success')
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
            ' into this device, preserving other local records. Continue only if the local records belong with this account.'
          )) return

      const row = await Sync.pull()
      const shape = Sync.workspaceToImportShape(row)
      if (!shape) {
        notify?.('The cloud account has no saved profile to restore yet.', 'info')
        return
      }
      const stats = await importAll(shape, { wipe: false })
      await refresh?.()
      notify?.('Pulled cloud profile for ' + (userEmail || 'this account') +
        ' (' + stats.rows + ' records imported). Local records were preserved.', 'success')
    } catch (e) {
      const message = e?.message || 'Cloud profile could not be pulled'
      if (/No workspace|404/i.test(message)) {
        notify?.('No saved cloud profile was found for ' + (userEmail || 'this account') + '.', 'error')
      } else {
        notify?.('Profile pull failed: ' + message, 'error')
      }
    } finally {
      setPulling(false)
    }
  }

  /** Push all local invoices so AutoResponder always has live data */
  const pushAllStatus = async () => {
    if (!Sync.isLoggedIn()) return notify?.('Login to cloud first', 'error')
    setBusy(true)
    try {
      const payload = (invoices || []).map((inv) => {
        const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
        return Sync.statusFromInvoice(inv, client)
      }).filter((x) => x.invoice_number)
      if (!payload.length) {
        notify?.('No invoices to push', 'info')
        return
      }
      const r = await Sync.pushInvoiceStatus(payload)
      notify?.(`Pushed ${r.count ?? payload.length} invoice status(es) to cloud`, 'success')
    } catch (e) {
      notify?.(e.message || 'Push failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'connected') {
    return (
      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Connected as <strong>{userEmail || 'cloud user'}</strong>.
          AutoResponder reads live invoice status from this cloud.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Server: {Sync.base}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <LoadingButton loading={busy} onClick={pushAllStatus}>
            Push all invoice statuses
          </LoadingButton>
          <LoadingButton loading={pulling} className="btn btn-outline" onClick={pullCloudProfile}>
            {pulling ? 'Pulling profile…' : 'Pull / restore cloud profile'}
          </LoadingButton>
          <button type="button" className="btn btn-outline" onClick={doLogout}>
            Logout from cloud
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
          Tip: saving an invoice also pushes its status automatically when you are logged in.
        </p>
      </div>
    )
  }

  return (
    <div className="card form-grid">
      <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Login so this device can push live invoice status for AutoResponder.
      </p>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="current-password" />
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
