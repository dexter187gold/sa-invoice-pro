import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import AppLogo from '../components/AppLogo'
import * as db from '../lib/db'
import { Sync } from '../lib/sync'

const SPLASH_MS = 2800

export default function Login() {
  const { login, register, resetPassword, toast, user, company, refresh } = useApp()
  const nav = useNavigate()
  const fileRef = useRef(null)
  const [mode, setMode] = useState('in')
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', emailConfirm: '', newPassword: '', recoveryCode: '' })
  const [shownCode, setShownCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [splash, setSplash] = useState(() => { try { return sessionStorage.getItem('sa_splash_done') !== '1' } catch { return true } })
  const [fade, setFade] = useState(false)
  const [profileCount, setProfileCount] = useState(null)

  useEffect(() => { if (user) nav(company?.name ? '/' : '/setup', { replace: true }) }, [user, company, nav])
  useEffect(() => { db.getAll(db.STORES.users).then((u) => setProfileCount((u || []).length)).catch(() => setProfileCount(0)) }, [])
  useEffect(() => {
    if (!splash) return
    const t1 = setTimeout(() => setFade(true), SPLASH_MS - 450)
    const t2 = setTimeout(() => { setSplash(false); try { sessionStorage.setItem('sa_splash_done', '1') } catch {} }, SPLASH_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [splash])

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') {
        await login(form.username || form.email, form.password)
        toast('Welcome back to the lab', 'success')
        await refresh?.()
        const co = await db.getCompany()
        nav(co?.name ? '/' : '/setup', { replace: true })
      } else if (mode === 'up') {
        if (!form.username || !form.email || !form.password) throw new Error('Fill username, email and password')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        await register(form)
        toast('Account created', 'success')
        nav('/setup', { replace: true })
      } else {
        const email = form.emailConfirm || form.email || form.username
        const result = await resetPassword({
          usernameOrEmail: form.username || form.email,
          emailConfirm: email,
          newPassword: form.newPassword || form.password,
          recoveryCode: form.recoveryCode || undefined,
        })
        if (result?.cloud) {
          toast('Cloud password reset — signed in. Profile will restore automatically.', 'success')
          await refresh?.()
          const co = await db.getCompany()
          nav(co?.name ? '/' : '/setup', { replace: true })
        } else {
          toast('Password updated on this device — sign in with your new password', 'success')
          setMode('in')
          setForm((f) => ({ ...f, password: '', newPassword: '', emailConfirm: '', recoveryCode: '' }))
          setShownCode('')
        }
      }
    } catch (err) {
      toast(err.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onImportBackup = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const stats = await db.importAll(data, { wipe: false })
      await refresh?.()
      const users = await db.getAll(db.STORES.users)
      setProfileCount((users || []).length)
      toast(`Backup imported: ${stats.rows} records` + ((users || []).length ? '. Sign in with your existing username/password.' : '. Create an account next.'), 'success')
      setMode('in')
    } catch (err) {
      toast(err.message || 'Import failed — check the JSON file', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {splash && (
        <div className={`login-splash ${fade ? 'fade-out' : ''}`} aria-live="polite">
          <div className="login-splash-inner">
            <AppLogo size={104} />
            <div className="login-splash-title">SA INVOICE PRO</div>
            <p className="muted" style={{ color: 'rgba(240,230,255,0.85)', margin: '0.35rem 0 0' }}>Invoices · Job cards · Payroll · Accounting · SA</p>
            <p className="muted" style={{ color: 'rgba(232,121,249,0.75)', margin: '0.35rem 0 0', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pinky & the Brain · Lab Edition</p>
            <div className="login-splash-bar" aria-hidden><span /></div>
          </div>
        </div>
      )}
      <div className="card auth-card auth-card-modern">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><AppLogo size={72} /></div>
        <h1 style={{ margin: '0 0 .25rem', textAlign: 'center', fontSize: '1.35rem', letterSpacing: '0.06em' }}>SA INVOICE PRO</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>Lab · offline-first · South Africa · v{APP_VERSION}</p>
        {profileCount === 0 && mode !== 'forgot' && (
          <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 0 }}>No local profiles on this device yet. Create an account or import a backup below.</p>
        )}
        <div className="tabs">
          <button type="button" className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>Sign in</button>
          <button type="button" className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>Create account</button>
          <button type="button" className={`tab ${mode === 'forgot' ? 'active' : ''}`} onClick={() => setMode('forgot')}>Forgot password</button>
        </div>
        <form onSubmit={onSubmit} className="stack" style={{ gap: 12, marginTop: 12 }}>
          {mode === 'forgot' ? (
            <>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Cloud reset: request a 6-digit recovery code, then enter it with a new password. Works on any device.
              </p>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Account email</span>
                <input className="input" type="email" required value={form.emailConfirm || form.email} onChange={(e) => setForm({ ...form, emailConfirm: e.target.value, email: e.target.value, username: e.target.value })} autoComplete="email" placeholder="you@example.com" /></label>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || !(form.emailConfirm || form.email)}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const email = (form.emailConfirm || form.email || '').trim()
                    if (!email) throw new Error('Enter your email first')
                    const data = await Sync.forgotPassword(email)
                    const code = data.recovery_code || ''
                    setShownCode(code)
                    if (code) {
                      setForm((f) => ({ ...f, recoveryCode: code }))
                      toast('Recovery code ready — enter it below with a new password (expires in 1 hour)', 'success')
                    } else {
                      toast(data.message || 'If that email exists, a recovery code was prepared', 'info')
                    }
                  } catch (err) {
                    toast(err.message || String(err), 'error')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Requesting…' : 'Get recovery code'}
              </button>
              {shownCode ? (
                <p style={{ margin: 0, padding: '10px 12px', background: 'rgba(232,121,249,.15)', borderRadius: 8, fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.2em', textAlign: 'center' }}>
                  {shownCode}
                </p>
              ) : null}
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Recovery code (6 digits) — optional if profile is already on this device</span>
                <input className="input" inputMode="numeric" maxLength={6} value={form.recoveryCode} onChange={(e) => setForm({ ...form, recoveryCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="123456" autoComplete="one-time-code" /></label>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>New password (min 6)</span>
                <input className="input" type="password" required minLength={6} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" /></label>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Updating…' : form.recoveryCode ? 'Reset with recovery code' : 'Reset on this device only'}</button>
            </>
          ) : (
            <>
              {mode === 'up' && (
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Display name</span>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
              )}
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>{mode === 'up' ? 'Username' : 'Username or email'}</span>
                <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" /></label>
              {mode === 'up' && (
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Email</span>
                  <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
              )}
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Password</span>
                <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Enter the lab' : 'Create account'}</button>
            </>
          )}
        </form>
        {mode === 'in' && (
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
            <button type="button" style={{ background: 'none', border: 0, color: '#e879f9', cursor: 'pointer' }} onClick={() => setMode('forgot')}>Forgot password?</button>
          </p>
        )}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(232,121,249,.2)' }}>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 8px', textAlign: 'center' }}>Moving from another phone/browser? Import your JSON backup here (works before sign-in).</p>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportBackup} />
          <button type="button" className="btn" style={{ width: '100%' }} disabled={busy} onClick={() => fileRef.current?.click()}>Import backup JSON</button>
        </div>
      </div>
    </div>
  )
}
