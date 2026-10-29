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
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', emailConfirm: '', newPassword: '', recoveryCode: '', inviteCode: '' })
  const [shownCode, setShownCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [splash, setSplash] = useState(() => { try { return sessionStorage.getItem('sa_splash_done') !== '1' } catch { return true } })
  const [fade, setFade] = useState(false)
  const [profileCount, setProfileCount] = useState(null)
  const [companies, setCompanies] = useState([])
  const [companyEditor, setCompanyEditor] = useState(null)
  const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', address: '', vatNumber: '' })
  const [companyBusy, setCompanyBusy] = useState(false)
  const [companyPanel, setCompanyPanel] = useState(false)

  const loadCompanies = async () => {
    const rows = await db.getCompanies()
    setCompanies(rows || [])
    const active = await db.getCompany()
    if (active) setCompanyForm({ name: active.name || '', email: active.email || '', phone: active.phone || '', address: active.address || '', vatNumber: active.vatNumber || '' })
  }
  useEffect(() => { loadCompanies().catch(() => {}) }, [])

  const startCompanyEdit = (row = null) => {
    setCompanyEditor(row?.id || 'new')
    setCompanyForm({ name: row?.name || '', email: row?.email || '', phone: row?.phone || '', address: row?.address || '', vatNumber: row?.vatNumber || '' })
    setCompanyPanel(true)
  }
  const saveCompanyProfile = async (e) => {
    e.preventDefault()
    if (!companyForm.name.trim()) return toast('Company name is required', 'error')
    setCompanyBusy(true)
    try {
      const row = { ...(companyEditor && companyEditor !== 'new' ? { id: companyEditor } : {}), ...companyForm, name: companyForm.name.trim() }
      const saved = await db.saveCompany(row, { createNew: companyEditor === 'new' })
      await db.setActiveCompany(saved.id)
      await loadCompanies()
      setCompanyEditor(null); setCompanyPanel(false)
      toast('Company profile saved', 'success')
    } catch (err) { toast(err?.message || 'Could not save company', 'error') }
    finally { setCompanyBusy(false) }
  }
  const chooseCompany = async (id) => {
    try { await db.setActiveCompany(id); await loadCompanies(); toast('Company profile selected', 'success') }
    catch (err) { toast(err?.message || 'Could not select company', 'error') }
  }
  const removeCompanyProfile = async (row) => {
    if (!window.confirm('Delete company profile "' + row.name + '"? This removes the profile only.')) return
    try {
      const active = await db.deleteCompany(row.id)
      await loadCompanies()
      if (active) await db.setActiveCompany(active.id)
      toast('Company profile deleted', 'success')
    } catch (err) { toast(err?.message || 'Could not delete company', 'error') }
  }

  // Google OAuth return: store token and enter app
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const gt = q.get('google_token')
      const em = q.get('email')
      if (gt) {
        try {
          localStorage.setItem('saip_sync_token', gt)
          localStorage.setItem('sa_cloud_token', gt)
          if (em) localStorage.setItem('sa_cloud_email', em)
        } catch {}
        window.history.replaceState({}, '', '/login')
        window.location.href = '/'
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetch((Sync.base || 'https://saip-sync.onrender.com') + '/api/auth/google/status')
      .then((r) => r.json())
      .then((j) => setGoogleEnabled(!!j.enabled))
      .catch(() => setGoogleEnabled(false))
  }, [])

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
        toast('Welcome back', 'success')
        await refresh?.()
        const co = await db.getCompany()
        nav(co?.name ? '/' : '/setup', { replace: true })
      } else if (mode === 'up') {
        if (!form.username || !form.email || !form.password) throw new Error('Fill username, email and password')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
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
            <p className="muted" style={{ color: 'rgba(240,230,255,0.85)', margin: '0.35rem 0 0' }}>Professional invoicing, payments & business management</p>
            <p className="muted" style={{ color: 'rgba(232,121,249,0.75)', margin: '0.35rem 0 0', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>SOUTH AFRICAN BUSINESS WORKSPACE</p>
            <div className="login-splash-bar" aria-hidden><span /></div>
          </div>
        </div>
      )}
      <div className="card auth-card auth-card-modern">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><AppLogo size={72} /></div>
        <h1 style={{ margin: '0 0 .25rem', textAlign: 'center', fontSize: '1.35rem', letterSpacing: '0.06em' }}>SA INVOICE PRO</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>Secure business workspace · South Africa · v{APP_VERSION}</p>
        {profileCount === 0 && mode !== 'forgot' && (
          <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 0 }}>No local profiles on this device yet. Create an account or import a backup below.</p>
        )}
        {mode === 'in' && (
          <section className="card" style={{ margin: '12px 0', padding: 12, border: '1px solid var(--border, #d1d5db)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div><strong>Company profiles</strong><p className="muted" style={{ margin: '3px 0 0', fontSize: 12 }}>Select or manage the company identity used by the workspace.</p></div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => companyPanel ? (setCompanyPanel(false), setCompanyEditor(null)) : startCompanyEdit(null)}>{companyPanel ? 'Cancel' : '+ Add company'}</button>
            </div>
            {companies.length > 0 ? <div className="stack" style={{ gap: 6, marginTop: 10 }}>
              {companies.map((co) => <div key={co.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: 8, border: '1px solid var(--border, #d1d5db)', borderRadius: 8 }}>
                <div style={{ minWidth: 0, flex: '1 1 140px' }}><strong>{co.name || 'Unnamed company'}</strong><div className="muted" style={{ fontSize: 12 }}>{co.email || co.phone || 'No contact details'}</div></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button type="button" className="btn btn-outline btn-sm" onClick={() => chooseCompany(co.id)}>Use</button><button type="button" className="btn btn-outline btn-sm" onClick={() => startCompanyEdit(co)}>Edit</button><button type="button" className="btn btn-outline btn-sm" onClick={() => removeCompanyProfile(co)} aria-label={'Delete ' + co.name}>Delete</button></div>
              </div>)}
            </div> : <p className="muted" style={{ fontSize: 12 }}>No company profile yet. Add one or sign in and complete setup.</p>}
            {companyPanel && <form className="stack" onSubmit={saveCompanyProfile} style={{ gap: 8, marginTop: 12 }}>
              <strong>{companyEditor && companyEditor !== 'new' ? 'Edit company profile' : 'Add company profile'}</strong>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Company name *</span><input className="input" required value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} /></label>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Email</span><input className="input" type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></label>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Phone</span><input className="input" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></label>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>VAT number</span><input className="input" value={companyForm.vatNumber} onChange={(e) => setCompanyForm({ ...companyForm, vatNumber: e.target.value })} /></label>
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Address</span><textarea className="input" rows={2} value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} /></label>
              <button className="btn btn-primary" type="submit" disabled={companyBusy}>{companyBusy ? 'Saving…' : 'Save company profile'}</button>
              <p className="muted" style={{ fontSize: 11, margin: 0 }}>Profiles are selectable identities. Separate records and role-bound accounts need server-side tenant access controls before using this for independent legal entities.</p>
            </form>}
          </section>
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
                <p style={{ margin: 0, padding: '10px 12px', background: 'rgba(0,122,77,.10)', borderRadius: 8, fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.2em', textAlign: 'center' }}>
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
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Team invite code (optional)</span>
                  <input className="input" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value.trim().toLowerCase() })} placeholder="Enter code from your company admin" autoComplete="off" />
                </label>
              )}
              {mode === 'up' && (
                <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Email</span>
                  <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
              )}
              <label className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Password</span>
                <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in securely' : 'Create account'}</button>
              {mode === 'in' && (
                <>
                  <p className="muted" style={{ textAlign: 'center', margin: '4px 0 0', fontSize: 12 }}>or</p>
                  {googleEnabled ? (
                    <a className="btn btn-outline" style={{ display: 'block', textAlign: 'center' }}
                      href={(Sync.base || 'https://saip-sync.onrender.com').replace(/\/$/, '') + '/api/auth/google'}>
                      Sign in with Google
                    </a>
                  ) : (
                    <p className="muted" style={{ textAlign: 'center', fontSize: 12, margin: 0 }}>
                      Google sign-in activates when GOOGLE_CLIENT_ID is set on the sync server
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </form>
        {mode === 'in' && (
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13 }}>
            <button type="button" style={{ background: 'none', border: 0, color: 'var(--green)', cursor: 'pointer' }} onClick={() => setMode('forgot')}>Forgot password?</button>
          </p>
        )}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,122,77,.18)' }}>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 8px', textAlign: 'center' }}>Moving from another phone/browser? Import your JSON backup here (works before sign-in).</p>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportBackup} />
          <button type="button" className="btn" style={{ width: '100%' }} disabled={busy} onClick={() => fileRef.current?.click()}>Import backup JSON</button>
        </div>
      </div>
    </div>
  )
}
