import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import AppLogo from '../components/AppLogo'
import * as db from '../lib/db'
import { Sync } from '../lib/sync'

const SPLASH_MS = 1600

function AuthLogoSequence() {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => { const elapsed = (Date.now() - started) % 9600; setPhase(elapsed < 6400 ? Math.floor(elapsed / 1600) : 4) }, 80)
    return () => clearInterval(timer)
  }, [])
  const binary = ['01010011','01001001','01001110','01010110','01001111','01001001','01000011','01000101']
  return (
    <section className={`auth-logo-sequence phase-${phase}`} aria-label="SA Invoice Pro logo animation">
      <div className="auth-logo-stage">
        <div className="auth-binary-rain" aria-hidden="true">
          {binary.map((bits, i) => <span key={i} style={{ '--stream': i, '--delay': `${i * -0.13}s` }}>{bits}<br />{bits.slice(0,4)}<br />{bits.slice(4)}</span>)}
        </div>
        <div className="auth-invoice-build" aria-hidden="true">
          {[0,1,2].map((n) => <div className={`auth-invoice-sheet sheet-${n}`} key={n}><b>INVOICE</b><i /><i /><i /><strong>R</strong></div>)}
        </div>
        <div className="auth-logo-core">
          <div className="auth-logo-fill" aria-hidden="true" />
          <AppLogo size={174} />
        </div>
        <div className="auth-logo-orbit" aria-hidden="true" />
      </div>
      <div className="auth-logo-caption">SA INVOICE PRO</div>
      <div className="auth-logo-subcaption">YOUR BUSINESS. IN PERFECT ORDER.</div>
    </section>
  )
}

export default function Login() {
  const { login, register, resetPassword, refresh, toast } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState('in')
  const [busy, setBusy] = useState(false)
  const [profileCount, setProfileCount] = useState(0)
  const [splash, setSplash] = useState(() => {
    try { return sessionStorage.getItem('sa_splash_done') !== '1' } catch { return true }
  })
  const [fade, setFade] = useState(false)
  const [shownCode, setShownCode] = useState('')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    inviteCode: '',
    newPassword: '',
    emailConfirm: '',
    recoveryCode: '',
  })

  useEffect(() => {
    db.getAll(db.STORES.users).then((u) => setProfileCount((u || []).length)).catch(() => setProfileCount(0))
  }, [])

  useEffect(() => {
    if (!splash) return
    const t1 = setTimeout(() => setFade(true), SPLASH_MS - 400)
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
      } else if (mode === 'up') {
        if (!form.username || !form.email || !form.password) throw new Error('Fill username, email and password')
        if (form.password.length < 6 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
          throw new Error('Password must be at least 6 characters and include letters and numbers (e.g. Shop123)')
        }
        await register(form)
        if (form.inviteCode.trim()) {
          await Sync.joinTeam(form.inviteCode)
          await Sync.logout()
          await login(form.email, form.password)
          await refresh?.()
          toast('Account created and linked to the team role', 'success')
        } else {
          toast('Account created', 'success')
        }
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

  return (
    <div className="auth-page">
      {splash && (
        <div className={`login-splash ${fade ? 'fade-out' : ''}`} aria-live="polite">
          <div className="login-splash-inner">
            <AppLogo size={104} />
            <div className="login-splash-title">SA INVOICE PRO</div>
            <p style={{ color: 'rgba(220,252,231,0.95)', margin: '0.35rem 0 0' }}>Professional invoicing, payments & business management</p>
            <p style={{ color: 'rgba(167,243,208,0.9)', margin: '0.35rem 0 0', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SOUTH AFRICAN BUSINESS WORKSPACE</p>
            <div className="login-splash-bar" aria-hidden><span /></div>
          </div>
        </div>
      )}
      <div className="auth-layout">
        <aside className="auth-brand-panel">
          <div className="auth-brand-lockup"><AppLogo size={58} /><div><strong>SA INVOICE PRO</strong><span>BUSINESS MANAGEMENT SUITE</span></div></div>
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">ONE WORKSPACE. COMPLETE CONTROL.</span>
            <h2>Run your business with confidence.</h2>
            <p>Professional tools for South African businesses — from quotes and invoices to payments, accounting, payroll and customer management.</p>
            <div className="auth-feature-list">
              <span><i>✓</i> Invoicing & customer accounts</span>
              <span><i>✓</i> Payments & bank reconciliation</span>
              <span><i>✓</i> Accounting, expenses & payroll</span>
            </div>
          </div>
          <p className="auth-brand-foot" style={{ fontSize: 12, marginTop: 'auto' }}>v{APP_VERSION}</p>
        </aside>

        <AuthLogoSequence />\n        <div className="auth-card-modern">
          <div className="tabs">
            <button type="button" className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>Sign in</button>
            <button type="button" className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>Create account</button>
            <button type="button" className={`tab ${mode === 'forgot' ? 'active' : ''}`} onClick={() => setMode('forgot')}>Forgot password</button>
          </div>

          {!profileCount && mode === 'in' && (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 0 }}>No local profiles on this device yet. Create an account to get started.</p>
          )}

          <form onSubmit={onSubmit} className="stack" style={{ gap: 12 }}>
            {mode === 'forgot' && (
              <>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  Cloud reset: request a 6-digit recovery code, then enter it with a new password. Works on any device.
                </p>
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Email</span>
                  <input className="input" type="email" required value={form.emailConfirm || form.email} onChange={(e) => setForm({ ...form, emailConfirm: e.target.value, email: e.target.value, username: e.target.value })} autoComplete="email" placeholder="you@example.com" /></label>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const email = form.emailConfirm || form.email || form.username
                      const res = await Sync.forgotPassword(email)
                      if (res?.code) setShownCode(String(res.code))
                      toast('Recovery code ready — enter it below with a new password (expires in 1 hour)', 'success')
                    } catch (err) {
                      toast(err.message || 'Could not request recovery code', 'error')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Send recovery code
                </button>
                {shownCode ? <p className="muted" style={{ fontSize: 12 }}>Dev code: <strong style={{ color: '#0d3324' }}>{shownCode}</strong></p> : null}
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Recovery code</span>
                  <input className="input" value={form.recoveryCode} onChange={(e) => setForm({ ...form, recoveryCode: e.target.value })} placeholder="6-digit code" /></label>
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>New password (letters + numbers, min 6)</span>
                  <input className="input" type="password" required minLength={6} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" /></label>
              </>
            )}

            {mode !== 'forgot' && (
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
                {mode === 'up' && (
                  <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Team invite code (optional)</span>
                    <input className="input" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} placeholder="From your shop owner" /></label>
                )}
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Password</span>
                  <input className="input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'up' ? 'Letters + numbers, min 6' : undefined} /></label>
              </>
            )}

            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Reset password'}
            </button>
            {mode === 'in' && (
              <button type="button" style={{ background: 'none', border: 0, color: '#08794e', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('forgot')}>Forgot password?</button>
            )}
          </form>

        </div>
      </div>
    </div>
  )
}
