import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import AppLogo from '../components/AppLogo'
import * as db from '../lib/db'

const SPLASH_MS = 5000

export default function Login() {
  const { login, register, toast, user, company, refresh } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '' })
  const [busy, setBusy] = useState(false)
  const [splash, setSplash] = useState(() => {
    try {
      return sessionStorage.getItem('sa_splash_done') !== '1'
    } catch {
      return true
    }
  })
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (user) nav(company?.name ? '/' : '/setup', { replace: true })
  }, [user, company, nav])

  useEffect(() => {
    if (!splash) return
    const t1 = setTimeout(() => setFade(true), SPLASH_MS - 450)
    const t2 = setTimeout(() => {
      setSplash(false)
      try { sessionStorage.setItem('sa_splash_done', '1') } catch {}
    }, SPLASH_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [splash])

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') {
        await login(form.username || form.email, form.password)
        toast('Welcome back', 'success')
        await refresh?.()
        const co = await db.getCompany()
        nav(co?.name ? '/' : '/setup', { replace: true })
      } else {
        if (!form.username || !form.email || !form.password) throw new Error('Fill username, email and password')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        await register(form)
        toast('Account created', 'success')
        nav('/setup', { replace: true })
      }
    } catch (err) {
      toast(err.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {splash && (
        <div className={`login-splash ${fade ? 'fade-out' : ''}`} aria-live="polite">
          <div className="login-splash-inner">
            <AppLogo size={96} />
            <div className="login-splash-title">SA INVOICE PRO</div>
            <p className="muted" style={{ color: 'rgba(236,253,245,0.75)', margin: '0.35rem 0 0' }}>
              Invoices · Job cards · Payroll · Accounting · SA
            </p>
            <p className="muted" style={{ color: 'rgba(236,253,245,0.55)', margin: '0.2rem 0 0', fontSize: 12 }}>
              Offline-first · Tax invoices · PayFast · POPIA templates
            </p>
            <div className="login-splash-bar" aria-hidden><span /></div>
          </div>
        </div>
      )}

      <div className="card auth-card auth-card-modern">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <AppLogo size={64} />
        </div>
        <h1 style={{ margin: '0 0 .25rem', textAlign: 'center', fontSize: '1.35rem', letterSpacing: '0.06em' }}>
          SA INVOICE PRO
        </h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
          Modern · offline-first · South Africa · v{APP_VERSION}
        </p>
        <div className="tabs">
          <button type="button" className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>Sign in</button>
          <button type="button" className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>Create account</button>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {mode === 'up' && (
            <>
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="label">{mode === 'in' ? 'Username or email' : 'Username'}</label>
            <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
