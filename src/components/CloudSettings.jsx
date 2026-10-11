import React, { useEffect, useState } from 'react'
import { Sync } from '../lib/sync'
import { LoadingButton } from './ui'

export default function CloudSettings({ toast }) {
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

  if (status === 'connected') {
    return (
      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Connected as <strong>{userEmail || 'cloud user'}</strong>.
          Your invoices can sync across devices and AutoResponder can look up live status.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Server: {Sync.base}
        </p>
        <button type="button" className="btn btn-outline" onClick={doLogout}>
          Logout from cloud
        </button>
      </div>
    )
  }

  return (
    <div className="card form-grid">
      <h3 style={{ marginTop: 0 }}>☁ Cloud Sync</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Login with your cloud account so this device can push live invoice status for AutoResponder.
      </p>
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@pcrepairdex.co.za"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="label">Name (only for new register)</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <LoadingButton loading={busy} onClick={doLogin}>
          Login
        </LoadingButton>
        <LoadingButton loading={busy} className="btn btn-secondary" onClick={doRegister}>
          Register
        </LoadingButton>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        <a href={`${Sync.base}/forgot-password`} target="_blank" rel="noreferrer">
          Forgot password?
        </a>
        {' · '}
        Same account works on phone + desktop.
      </p>
    </div>
  )
}
