import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { APP_VERSION } from '../config'
import AppLogo from '../components/AppLogo'
import { PageFade } from '../components/ui'
import { applyBusinessType, getBusinessType } from '../lib/businessTypes'
import {
  companyToForm,
  formToCompanyPayload,
  validateCompanyForm,
  profileCompleteness,
} from '../lib/companyProfile'
import CompanyProfileForm from '../components/CompanyProfileForm'
import ModuleSetupStep from '../components/ModuleSetupStep'

const PHASES = [
  { id: 1, title: 'Personal', blurb: 'Your profile on this workspace' },
  { id: 2, title: 'Company', blurb: 'Business identity, tax & banking' },
  { id: 3, title: 'Preferences', blurb: 'Look, VAT, module pack & finish' },
]

function loadPrefs() {
  try {
    return {
      theme: localStorage.getItem('sa_theme') || 'sniper',
      navLayout: JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}').layout || 'bottom',
      vatEnabled: localStorage.getItem('sa_vat_enabled') !== '0',
      vatRate: Number(localStorage.getItem('sa_vat_rate') || 15) || 15,
    }
  } catch {
    return { theme: 'sniper', navLayout: 'bottom', vatEnabled: true, vatRate: 15 }
  }
}

export default function Setup() {
  const {
    user, setUser, company, setCompany, toast, refresh,
    setTheme, setVatEnabled, setVatRate,
  } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState(1)
  const [companySection, setCompanySection] = useState(1)

  const [personal, setPersonal] = useState(() => ({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'Owner',
    jobTitle: user?.jobTitle || '',
  }))

  const [form, setForm] = useState(() => companyToForm(company))
  const [prefs, setPrefs] = useState(loadPrefs)

  React.useEffect(() => {
    if (company?.name) nav('/', { replace: true })
  }, [company, nav])

  React.useEffect(() => {
    if (!user) return
    setPersonal((p) => ({
      ...p,
      name: p.name || user.name || user.displayName || '',
      email: p.email || user.email || '',
      phone: p.phone || user.phone || '',
    }))
  }, [user?.id, user?.email])

  const complete = profileCompleteness(form)
  const biz = getBusinessType(form.businessType)

  const setP = (key) => (e) => setPersonal({ ...personal, [key]: e.target.value })
  const setPref = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setPrefs((p) => ({ ...p, [key]: v }))
  }

  const validatePersonal = () => {
    if (!String(personal.name || '').trim()) return 'Your name is required'
    if (personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personal.email).trim())) {
      return 'Email looks invalid'
    }
    return null
  }

  const savePersonalLocal = async () => {
    const name = String(personal.name || '').trim()
    const email = String(personal.email || '').trim().toLowerCase()
    const phone = String(personal.phone || '').trim()
    const role = String(personal.role || 'Owner').trim()
    const jobTitle = String(personal.jobTitle || '').trim()
    try {
      localStorage.setItem('sa_personal_profile', JSON.stringify({ name, email, phone, role, jobTitle }))
    } catch {}
    if (user?.id) {
      try {
        const existing = await db.get(STORES.users, user.id)
        if (existing) {
          const next = {
            ...existing,
            name,
            email: email || existing.email,
            phone,
            role,
            jobTitle,
            updatedAt: new Date().toISOString(),
          }
          await db.put(STORES.users, next)
          setUser?.(next)
        } else {
          setUser?.({ ...user, name, email: email || user.email, phone, role, jobTitle })
        }
      } catch {
        setUser?.({ ...user, name, email: email || user.email, phone, role, jobTitle })
      }
    }
  }

  const applyPreferences = () => {
    try {
      localStorage.setItem('sa_theme', prefs.theme)
      localStorage.setItem('sa_vat_enabled', prefs.vatEnabled ? '1' : '0')
      localStorage.setItem('sa_vat_rate', String(prefs.vatRate || 15))
      const navPrefs = { layout: prefs.navLayout || 'bottom' }
      localStorage.setItem('sa_nav_prefs', JSON.stringify(navPrefs))
      window.dispatchEvent(new CustomEvent('sa-nav-prefs', { detail: navPrefs }))
    } catch {}
    try { setTheme?.(prefs.theme) } catch {}
    try { setVatEnabled?.(!!prefs.vatEnabled) } catch {}
    try { setVatRate?.(Number(prefs.vatRate) || 15) } catch {}
  }

  const next = async () => {
    if (phase === 1) {
      const err = validatePersonal()
      if (err) return toast(err, 'error')
      setBusy(true)
      try {
        await savePersonalLocal()
        toast('Personal profile saved', 'success')
        setPhase(2)
        setCompanySection(1)
      } finally {
        setBusy(false)
      }
      return
    }
    if (phase === 2) {
      if (companySection === 1 && !String(form.name || '').trim()) {
        return toast('Business name is required', 'error')
      }
      if (companySection < 4) {
        setCompanySection((s) => s + 1)
        return
      }
      const errors = validateCompanyForm(form)
      if (errors.length) return toast(errors[0], 'error')
      setPhase(3)
      return
    }
  }

  const back = () => {
    if (phase === 2 && companySection > 1) {
      setCompanySection((s) => s - 1)
      return
    }
    if (phase === 3) {
      setPhase(2)
      setCompanySection(4)
      return
    }
    if (phase === 2) {
      setPhase(1)
    }
  }

  const finish = async (e) => {
    e?.preventDefault?.()
    const err = validatePersonal()
    if (err) {
      setPhase(1)
      return toast(err, 'error')
    }
    const errors = validateCompanyForm(form)
    if (errors.length) {
      setPhase(2)
      setCompanySection(1)
      return toast(errors[0], 'error')
    }
    setBusy(true)
    try {
      await savePersonalLocal()
      applyPreferences()
      const payload = formToCompanyPayload(form)
      const row = await db.saveCompany(payload)
      setCompany(row)
      try { applyBusinessType(form.businessType) } catch {}
      await refresh()
      toast('Setup complete — welcome to the desk', 'success')
      nav('/', { replace: true })
    } catch (error) {
      toast(error?.message || 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const phaseBlurb = useMemo(() => {
    if (phase === 2) return `${PHASES[1].blurb} · section ${companySection}/4 · ${complete.pct}% profile`
    if (phase === 3) return `${PHASES[2].blurb} · ${biz.short}`
    return PHASES[0].blurb
  }, [phase, companySection, complete.pct, biz.short])

  return (
    <div className="auth-page">
      <PageFade>
        <div className="card auth-card" style={{ width: 'min(640px, 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <AppLogo size={48} />
          </div>
          <h1 style={{ marginTop: 0, textAlign: 'center' }}>Workspace setup</h1>
          <p className="muted" style={{ textAlign: 'center' }}>
            Personal → Company → Preferences · v{APP_VERSION}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${phase === p.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPhase(p.id)}
                style={{ minWidth: 100 }}
              >
                {p.id}. {p.title}
              </button>
            ))}
          </div>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 0 }}>{phaseBlurb}</p>

          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
            <div
              style={{
                width: `${phase === 1 ? 20 : phase === 2 ? 40 + companySection * 10 : 100}%`,
                height: '100%',
                background: 'var(--biz-accent, var(--primary))',
                transition: 'width .2s ease',
              }}
            />
          </div>

          <form onSubmit={phase === 3 ? finish : (e) => { e.preventDefault(); next() }}>
            {phase === 1 && (
              <section className="form-section">
                <h4 style={{ marginTop: 0 }}>Personal information</h4>
                <p className="muted" style={{ fontSize: 13 }}>Who you are on this account — shown on internal notes and audit logs.</p>
                <div className="form-grid cols-2">
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input focus-ring" required value={personal.name} onChange={setP('name')} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="select" value={personal.role} onChange={setP('role')}>
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Technician">Technician</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Job title</label>
                    <input className="input" value={personal.jobTitle} onChange={setP('jobTitle')} placeholder="e.g. Managing Director" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={personal.email} onChange={setP('email')} placeholder="you@business.co.za" />
                  </div>
                  <div>
                    <label className="label">Mobile / WhatsApp</label>
                    <input className="input" value={personal.phone} onChange={setP('phone')} placeholder="0xx xxx xxxx" />
                  </div>
                </div>
              </section>
            )}

            {phase === 2 && (
              <CompanyProfileForm form={form} setForm={setForm} mode="setup-step" step={companySection} />
            )}

            {phase === 3 && (
              <section className="form-section">
                <h4 style={{ marginTop: 0 }}>Preferences</h4>
                <p className="muted" style={{ fontSize: 13 }}>Desk look, VAT defaults, then your {biz.short} module pack.</p>

                <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="label">Theme</label>
                    <select className="select" value={prefs.theme} onChange={setPref('theme')}>
                      <option value="sniper">Sniper (default)</option>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Navigation</label>
                    <select className="select" value={prefs.navLayout} onChange={setPref('navLayout')}>
                      <option value="bottom">Bottom navigation</option>
                      <option value="sidebar">Sidebar</option>
                      <option value="compact">Compact sidebar</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" checked={!!prefs.vatEnabled} onChange={setPref('vatEnabled')} />
                      Charge VAT on invoices
                    </label>
                  </div>
                  <div>
                    <label className="label">VAT rate %</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={prefs.vatRate}
                      onChange={setPref('vatRate')}
                      disabled={!prefs.vatEnabled}
                    />
                  </div>
                </div>

                <ModuleSetupStep businessTypeId={form.businessType} toast={toast} refresh={refresh} />
              </section>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {(phase > 1 || (phase === 2 && companySection > 1)) && (
                <button type="button" className="btn btn-outline" onClick={back} disabled={busy}>
                  Back
                </button>
              )}
              {phase < 3 ? (
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                  {phase === 2 && companySection < 4 ? 'Continue company details' : 'Continue'}
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                  {busy ? 'Saving…' : 'Complete setup & open desk'}
                </button>
              )}
            </div>

            {phase < 3 && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', marginTop: 8 }}
                disabled={busy || !String(personal.name || '').trim() || !String(form.name || '').trim()}
                onClick={finish}
              >
                Skip remaining steps & finish
              </button>
            )}
          </form>
        </div>
      </PageFade>
    </div>
  )
}
