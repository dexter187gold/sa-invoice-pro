import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
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

const BASE_STEPS = [
  { id: 1, title: 'Identity', blurb: 'Name, type, registration' },
  { id: 2, title: 'Contact', blurb: 'Reachability & address' },
  { id: 3, title: 'Tax & bank', blurb: 'VAT, banking, terms' },
  { id: 4, title: 'Details', blurb: 'Type-specific fields' },
  { id: 5, title: 'Module', blurb: 'Pack & checklist' },
]

export default function Setup() {
  const { company, setCompany, toast, refresh } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => companyToForm(company))

  React.useEffect(() => {
    if (company?.name) nav('/', { replace: true })
  }, [company, nav])

  const complete = profileCompleteness(form)
  const biz = getBusinessType(form.businessType)
  const maxStep = 5

  const next = () => {
    if (step === 1 && !String(form.name || '').trim()) {
      return toast('Business name is required', 'error')
    }
    setStep((s) => Math.min(maxStep, s + 1))
  }
  const back = () => setStep((s) => Math.max(1, s - 1))

  const save = async (e) => {
    e?.preventDefault?.()
    const errors = validateCompanyForm(form, { requireContact: false })
    if (errors.length) return toast(errors[0], 'error')
    setBusy(true)
    try {
      const payload = formToCompanyPayload(form)
      const row = await db.saveCompany(payload)
      setCompany(row)
      try { applyBusinessType(form.businessType) } catch {}
      await refresh()
      toast("Company saved — let's go", 'success')
      nav('/', { replace: true })
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <PageFade>
        <div className="card auth-card" style={{ width: 'min(640px, 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <AppLogo size={48} />
          </div>
          <h1 style={{ marginTop: 0, textAlign: 'center' }}>Company setup</h1>
          <p className="muted" style={{ textAlign: 'center' }}>
            Account profile + {biz.short} module · v{APP_VERSION}
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
            {BASE_STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`btn btn-sm ${step === s.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStep(s.id)}
                style={{ minWidth: 64 }}
              >
                {s.id}. {s.title}
              </button>
            ))}
          </div>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 0 }}>
            {BASE_STEPS[step - 1].blurb}
            {step === 5 ? ` · ${biz.label}` : ''}
            {' · '}Profile {complete.pct}%
          </p>

          <form onSubmit={step === maxStep ? save : (e) => { e.preventDefault(); next() }}>
            {step <= 4 && (
              <CompanyProfileForm form={form} setForm={setForm} mode="setup-step" step={step} />
            )}
            {step === 5 && (
              <ModuleSetupStep businessTypeId={form.businessType} toast={toast} refresh={refresh} />
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {step > 1 && (
                <button type="button" className="btn btn-outline" onClick={back} disabled={busy}>
                  Back
                </button>
              )}
              {step < maxStep ? (
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Continue
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ flex: 1 }}>
                  {busy ? 'Saving…' : 'Save & open desk'}
                </button>
              )}
            </div>
            {step < maxStep && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', marginTop: 8 }}
                disabled={busy || !String(form.name || '').trim()}
                onClick={save}
              >
                Save with what I have
              </button>
            )}
          </form>
        </div>
      </PageFade>
    </div>
  )
}
