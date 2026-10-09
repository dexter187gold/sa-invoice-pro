import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION } from '../config'
import AppLogo from '../components/AppLogo'
import { PageFade } from '../components/ui'

const TYPES = ['IT / MSP', 'Consulting', 'Retail / POS', 'Trades', 'Agriculture', 'Legal', 'Medical', 'Other']

export default function Setup() {
  const { company, setCompany, toast, refresh } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: company?.name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    vatNumber: company?.vatNumber || '',
    address: company?.address || '',
    businessType: company?.businessType || 'IT / MSP',
    bankName: company?.bankName || '',
    accountNumber: company?.accountNumber || '',
    branchCode: company?.branchCode || '',
  })

  React.useEffect(() => {
    if (company?.name) nav('/', { replace: true })
  }, [company, nav])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Company name required', 'error')
    setBusy(true)
    try {
      const row = await db.saveCompany({ ...form, name: form.name.trim() })
      setCompany(row)
      await refresh()
      toast("Company saved — let's go", 'success')
      nav('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <PageFade>
        <div className="card auth-card" style={{ width: 'min(520px, 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <AppLogo size={48} />
          </div>
          <h1 style={{ marginTop: 0, textAlign: 'center' }}>Company setup</h1>
          <p className="muted" style={{ textAlign: 'center' }}>
            One-time setup · ZAR · SA tax invoices · v{APP_VERSION}
          </p>
          <ol className="onboard-steps" style={{ fontSize: 13, marginBottom: 12 }}>
            <li>Business name & contact (required)</li>
            <li>VAT number if registered</li>
            <li>Bank details for invoice footers</li>
          </ol>
          <form className="form-grid" onSubmit={save}>
            <div>
              <label className="label">Business name *</label>
              <input className="input focus-ring" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="form-grid cols-2">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27…" />
              </div>
            </div>
            <div className="form-grid cols-2">
              <div>
                <label className="label">VAT number</label>
                <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
              </div>
              <div>
                <label className="label">Business type</label>
                <select className="select" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
                  {TYPES.map((ty) => <option key={ty}>{ty}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="textarea" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-grid cols-3">
              <div>
                <label className="label">Bank</label>
                <input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div>
                <label className="label">Account</label>
                <input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
              </div>
              <div>
                <label className="label">Branch</label>
                <input className="input" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : "Let's go"}
            </button>
          </form>
        </div>
      </PageFade>
    </div>
  )
}
