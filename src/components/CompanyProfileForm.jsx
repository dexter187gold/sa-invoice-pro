import React from 'react'
import {
  SA_PROVINCES,
  BANK_ACCOUNT_TYPES,
  PAYMENT_TERM_PRESETS,
  typeOptions,
  moduleFieldsForType,
  profileCompleteness,
} from '../lib/companyProfile'
import { getBusinessType } from '../lib/businessTypes'

export default function CompanyProfileForm({ form, setForm, mode = 'full', step = 1 }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const biz = getBusinessType(form.businessType)
  const moduleFields = moduleFieldsForType(form.businessType)
  const complete = profileCompleteness(form)
  const show = (s) => mode === 'full' || step === s

  return (
    <div className="company-profile-form">
      {mode === 'full' && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Profile strength: <strong>{complete.pct}%</strong> ({complete.done}/{complete.total} key areas)
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${complete.pct}%`, height: '100%', background: 'var(--biz-accent, var(--primary))' }} />
          </div>
        </div>
      )}

      {show(1) && (
        <section className="form-section" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Business identity</h4>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Legal / registered name *</label>
              <input className="input focus-ring" required value={form.name} onChange={set('name')} placeholder="As on CIPC / invoices" />
            </div>
            <div>
              <label className="label">Trading name</label>
              <input className="input" value={form.tradingName} onChange={set('tradingName')} placeholder="If different from legal name" />
            </div>
            <div>
              <label className="label">Business type</label>
              <select className="select" value={form.businessType} onChange={set('businessType')}>
                {typeOptions().map((ty) => (
                  <option key={ty.value} value={ty.value}>{ty.label}</option>
                ))}
              </select>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{biz.desc}</p>
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" value={form.website} onChange={set('website')} placeholder="https://" />
            </div>
            <div>
              <label className="label">CIPC registration no.</label>
              <input className="input" value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="e.g. 2020/123456/07" />
            </div>
            <div>
              <label className="label">Income tax number</label>
              <input className="input" value={form.taxNumber} onChange={set('taxNumber')} placeholder="SARS tax ref" />
            </div>
          </div>
        </section>
      )}

      {show(2) && (
        <section className="form-section" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Contact & address</h4>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="accounts@…" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="0xx xxx xxxx" />
            </div>
            <div>
              <label className="label">Alt phone</label>
              <input className="input" value={form.altPhone} onChange={set('altPhone')} />
            </div>
            <div>
              <label className="label">WhatsApp number</label>
              <input className="input" value={form.whatsapp} onChange={set('whatsapp')} placeholder="Same as phone or dedicated" />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="label">Street address</label>
            <textarea className="textarea" rows={2} value={form.address} onChange={set('address')} placeholder="Street, suburb" />
          </div>
          <div className="form-grid cols-3" style={{ marginTop: 8 }}>
            <div>
              <label className="label">City / town</label>
              <input className="input" value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className="label">Province</label>
              <select className="select" value={form.province} onChange={set('province')}>
                <option value="">Select…</option>
                {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Postal code</label>
              <input className="input" value={form.postalCode} onChange={set('postalCode')} />
            </div>
          </div>
        </section>
      )}

      {show(3) && (
        <section className="form-section" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Tax & banking (invoice footer)</h4>
          <div className="form-grid cols-2">
            <div>
              <label className="label">VAT number</label>
              <input className="input" value={form.vatNumber} onChange={set('vatNumber')} placeholder="10 digits if registered" />
            </div>
            <div>
              <label className="label">Default payment terms</label>
              <select className="select" value={form.paymentTerms} onChange={set('paymentTerms')}>
                {PAYMENT_TERM_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PAYE reference</label>
              <input className="input" value={form.payeReference} onChange={set('payeReference')} />
            </div>
            <div>
              <label className="label">UIF reference</label>
              <input className="input" value={form.uifReference} onChange={set('uifReference')} />
            </div>
            <div>
              <label className="label">SDL reference</label>
              <input className="input" value={form.sdlReference} onChange={set('sdlReference')} />
            </div>
          </div>
          <div className="form-grid cols-2" style={{ marginTop: 8 }}>
            <div>
              <label className="label">Bank name</label>
              <input className="input" value={form.bankName} onChange={set('bankName')} placeholder="FNB, Standard Bank…" />
            </div>
            <div>
              <label className="label">Account holder</label>
              <input className="input" value={form.accountHolder} onChange={set('accountHolder')} placeholder="Defaults to business name" />
            </div>
            <div>
              <label className="label">Account number</label>
              <input className="input" value={form.accountNumber} onChange={set('accountNumber')} />
            </div>
            <div>
              <label className="label">Branch code</label>
              <input className="input" value={form.branchCode} onChange={set('branchCode')} />
            </div>
            <div>
              <label className="label">Account type</label>
              <select className="select" value={form.bankAccountType} onChange={set('bankAccountType')}>
                {BANK_ACCOUNT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="label">Invoice footer / payment note</label>
            <textarea className="textarea" rows={2} value={form.invoiceFooter} onChange={set('invoiceFooter')} placeholder="Extra line on invoices" />
          </div>
        </section>
      )}

      {show(4) && moduleFields.length > 0 && (
        <section className="form-section" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>{biz.short} workspace details</h4>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Optional — used on job cards, quotes and docs for this business type.</p>
          <div className="form-grid cols-2">
            {moduleFields.map((f) => (
              <div key={f.key} style={f.key.includes('Note') || f.key.includes('Policy') || f.key === 'specialties' ? { gridColumn: '1 / -1' } : undefined}>
                <label className="label">{f.label}</label>
                <input className="input" value={form[f.key] || ''} onChange={set(f.key)} placeholder={f.placeholder || ''} />
              </div>
            ))}
          </div>
        </section>
      )}

      {show(4) && !moduleFields.length && mode === 'setup-step' && (
        <p className="muted">No extra fields for this business type — you can finish setup.</p>
      )}
    </div>
  )
}
