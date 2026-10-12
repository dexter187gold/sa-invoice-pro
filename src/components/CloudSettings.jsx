import React, { useEffect, useState } from 'react'
import { Sync } from '../lib/sync'
import { LoadingButton } from './ui'
import { useApp } from '../context/AppContext'

export default function CloudSettings({ toast }) {
  const { invoices, clients, refresh } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
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
      toast?.('Cloud login successful', 'success')
    } catch (e) {
      toast?.(e.message || 'Login failed', 'error')
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
      toast?.('Cloud account created & logged in', 'success')
    } catch (e) {
      toast?.(e.message || 'Register failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doLogout = () => {
    Sync.logout()
    setStatus('logged_out')
    setUserEmail('')
    toast?.('Logged out of cloud', 'success')
  }

  /** Push all local invoices so AutoResponder always has live data */
  const pushAllStatus = async () => {
    if (!Sync.isLoggedIn()) return toast?.('Login to cloud first', 'error')
    setBusy(true)
    try {
      const payload = (invoices || []).map((inv) => {
        const client = (clients || []).find((c) => String(c.id) === String(inv.clientId)) || {}
        return Sync.statusFromInvoice(inv, client)
      }).filter((x) => x.invoice_number)
      if (!payload.length) {
        toast?.('No invoices to push', 'info')
        return
      }
      const r = await Sync.pushInvoiceStatus(payload)
      toast?.(`Pushed ${r.count ?? payload.length} invoice status(es) to cloud`, 'success')
    } catch (e) {
      toast?.(e.message || 'Push failed', 'error')
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
