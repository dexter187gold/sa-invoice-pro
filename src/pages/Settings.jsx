import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { PayFast } from '../lib/payfast'
import { exportAll, importAll } from '../lib/db'
import { DEFAULT_LAYOUT, loadInvoiceLayout, saveInvoiceLayout, mergeLayout } from '../lib/invoiceLayout'
import { TEMPLATE_PRESETS } from '../lib/pdfTemplate'

export default function Settings() {
  const { company, setCompany, toast, refresh, vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme } = useApp()
  const [tab, setTab] = useState('company')
  const [form, setForm] = useState({
    name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
    vatNumber: company?.vatNumber || '', address: company?.address || '',
    bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
  })
  const [pf, setPf] = useState({ merchantId: '', merchantKey: '', passphrase: '', sandbox: true })
  const [look, setLook] = useState(() => { try { return JSON.parse(localStorage.getItem('sa_template') || '{}') } catch { return {} } })
  const [inv, setInv] = useState(DEFAULT_LAYOUT)

  useEffect(() => { PayFast.getConfig().then(setPf).catch(() => {}) }, [])
  useEffect(() => {
    if (company) setForm({
      name: company.name || '', email: company.email || '', phone: company.phone || '',
      vatNumber: company.vatNumber || '', address: company.address || '',
      bankName: company.bankName || '', accountNumber: company.accountNumber || '', branchCode: company.branchCode || '',
    })
  }, [company])
  useEffect(() => { loadInvoiceLayout().then(setInv).catch(() => {}) }, [])

  const saveCompany = async (e) => {
    e.preventDefault()
    const row = await db.saveCompany(form)
    setCompany(row)
    await refresh()
    toast('Company updated', 'success')
  }
  const saveVat = async () => {
    await db.setSetting('vatEnabled', vatEnabled)
    await db.setSetting('vatRate', vatRate)
    toast('VAT saved', 'success')
  }
  const savePf = async () => { await PayFast.saveConfig(pf); toast('PayFast saved', 'success') }
  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sa-invoice-backup.json'
    a.click()
    toast('Backup downloaded', 'success')
  }
  const doImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!confirm('Import backup?')) return
      await importAll(data, { wipe: false })
      await refresh()
      toast('Import complete', 'success')
    } catch (err) { toast(err.message || 'Import failed', 'error') }
  }
  const applyLook = (next) => {
    setLook(next)
    localStorage.setItem('sa_template', JSON.stringify(next))
    const r = document.documentElement
    if (next.accent) r.style.setProperty('--green', next.accent)
    if (next.radius) r.style.setProperty('--radius', next.radius + 'px')
    if (next.font) r.style.setProperty('font-family', next.font)
    toast('Look applied', 'success')
  }
  const patch = (p) => setInv((L) => mergeLayout({ ...L, ...p }))
  const saveInv = async () => {
    setInv(await saveInvoiceLayout(inv))
    toast('Invoice preferences saved', 'success')
  }
  const resetInv = async () => {
    setInv(await saveInvoiceLayout({ ...DEFAULT_LAYOUT }))
    toast('Preferences reset', 'success')
  }

  const tabs = [
    ['company', 'Company'],
    ['invoicing', 'Invoice preferences'],
    ['vat', 'VAT & theme'],
    ['look', 'App look'],
    ['payfast', 'PayFast'],
    ['backup', 'Backup'],
    ['about', 'About'],
  ]

  return (
    <div>
      <div className="page-header"><div><h1>Settings</h1><p className="subtitle">v{APP_VERSION}</p></div></div>
      <div className="tabs-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'company' && (
        <form className="card form-grid" onSubmit={saveCompany}>
          <div className="form-grid cols-2">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="form-grid cols-2">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">VAT number</label><input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></div>
          </div>
          <div><label className="label">Address</label><textarea className="textarea" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="form-grid cols-3">
            <input className="input" placeholder="Bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <input className="input" placeholder="Account" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            <input className="input" placeholder="Branch" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Save company</button>
        </form>
      )}

      {tab === 'invoicing' && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Invoice preferences</h3>
            <p className="muted" style={{ marginTop: 0 }}>Simple defaults for every new invoice. Change what you need, hit Save once.</p>
          </div>

          <div className="inv-prefs-group">
            <h4>Defaults for new invoices</h4>
            <div className="form-grid cols-2">
              <div>
                <label className="label">Package / style</label>
                <select className="select" value={inv.defaultTemplateId} onChange={(e) => patch({ defaultTemplateId: e.target.value })}>
                  {TEMPLATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Account type</label>
                <input className="input" value={inv.defaultAccountType || ''} onChange={(e) => patch({ defaultAccountType: e.target.value })} placeholder="COD Account" />
              </div>
              <div>
                <label className="label">Due in (days)</label>
                <input className="input" type="number" min={0} max={90} value={inv.defaultDueDays ?? 7} onChange={(e) => patch({ defaultDueDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Form spacing</label>
                <select className="select" value={inv.formDensity} onChange={(e) => patch({ formDensity: e.target.value })}>
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>
            </div>
            <label className="label" style={{ marginTop: 8 }}>Default notes</label>
            <textarea className="textarea" rows={2} value={inv.defaultNotes || ''} onChange={(e) => patch({ defaultNotes: e.target.value })} />
            <label className="label">Default payment note</label>
            <textarea className="textarea" rows={2} value={inv.defaultPaymentNote || ''} onChange={(e) => patch({ defaultPaymentNote: e.target.value })} />
          </div>

          <div className="inv-prefs-group">
            <h4>What to show on the invoice form</h4>
            <div className="inv-check-grid">
              <label><input type="checkbox" checked={inv.showJobBlock !== false} onChange={(e) => patch({ showJobBlock: e.target.checked })} /> Job details block</label>
              <label><input type="checkbox" checked={inv.showPo !== false} onChange={(e) => patch({ showPo: e.target.checked })} /> PO / order ref</label>
              <label><input type="checkbox" checked={inv.showDevices !== false} onChange={(e) => patch({ showDevices: e.target.checked })} /> Devices</label>
              <label><input type="checkbox" checked={inv.showServiceType !== false} onChange={(e) => patch({ showServiceType: e.target.checked })} /> Service type</label>
              <label><input type="checkbox" checked={inv.showTech !== false} onChange={(e) => patch({ showTech: e.target.checked })} /> Technician</label>
              <label><input type="checkbox" checked={inv.showSite !== false} onChange={(e) => patch({ showSite: e.target.checked })} /> Site address</label>
              <label><input type="checkbox" checked={inv.showSerials !== false} onChange={(e) => patch({ showSerials: e.target.checked })} /> Serial numbers</label>
              <label><input type="checkbox" checked={inv.showPaymentBlock !== false} onChange={(e) => patch({ showPaymentBlock: e.target.checked })} /> Payment wording block</label>
              <label><input type="checkbox" checked={inv.showBankBlock !== false} onChange={(e) => patch({ showBankBlock: e.target.checked })} /> Bank details block</label>
            </div>
          </div>

          <div className="inv-prefs-group">
            <h4>What goes on the PDF</h4>
            <div className="inv-check-grid">
              <label><input type="checkbox" checked={inv.showClientGrid !== false} onChange={(e) => patch({ showClientGrid: e.target.checked })} /> Client / devices grid</label>
              <label><input type="checkbox" checked={inv.showTerms !== false} onChange={(e) => patch({ showTerms: e.target.checked })} /> Terms & conditions</label>
              <label><input type="checkbox" checked={inv.showAcceptance !== false} onChange={(e) => patch({ showAcceptance: e.target.checked })} /> Signature / acceptance</label>
              <label><input type="checkbox" checked={inv.showBankDetails !== false} onChange={(e) => patch({ showBankDetails: e.target.checked })} /> Bank details</label>
            </div>
            <div className="form-grid cols-2" style={{ marginTop: 10 }}>
              <div>
                <label className="label">Header look</label>
                <select className="select" value={inv.headerStyle} onChange={(e) => patch({ headerStyle: e.target.value })}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                  <option value="banner">Strong banner</option>
                </select>
              </div>
              <div>
                <label className="label">Brand colour</label>
                <input className="input" type="color" value={inv.accentHex || '#007A4D'} onChange={(e) => patch({ accentHex: e.target.value })} />
              </div>
              <div>
                <label className="label">PDF text size ({inv.pdfFontSize}pt)</label>
                <input className="input" type="range" min={7} max={12} step={0.5} value={inv.pdfFontSize} onChange={(e) => patch({ pdfFontSize: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Extra footer line</label>
                <input className="input" value={inv.footerText || ''} onChange={(e) => patch({ footerText: e.target.value })} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={saveInv}>Save preferences</button>
            <button type="button" className="btn btn-outline" onClick={resetInv}>Reset to defaults</button>
          </div>
        </div>
      )}

      {tab === 'vat' && (
        <div className="card form-grid">
          <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} /> VAT enabled</label>
          <input className="input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
          <button type="button" className="btn btn-secondary" onClick={saveVat}>Save VAT</button>
          <button type="button" className="btn btn-outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle theme</button>
        </div>
      )}

      {tab === 'look' && (
        <div className="card form-grid">
          <h3 style={{ marginTop: 0 }}>App colours & chrome</h3>
          <label className="label">Accent</label>
          <input className="input" type="color" value={look.accent || '#007A4D'} onChange={(e) => applyLook({ ...look, accent: e.target.value })} />
          <label className="label">Corner radius</label>
          <input className="input" type="number" min="0" max="28" value={look.radius || 14} onChange={(e) => applyLook({ ...look, radius: Number(e.target.value) })} />
          <button type="button" className="btn btn-outline" onClick={() => {
            localStorage.removeItem('sa_template')
            document.documentElement.style.removeProperty('--green')
            document.documentElement.style.removeProperty('--radius')
            setLook({})
            toast('Reset', 'success')
          }}>Reset</button>
        </div>
      )}

      {tab === 'payfast' && (
        <div className="card form-grid">
          <input className="input" placeholder="Merchant ID" value={pf.merchantId} onChange={(e) => setPf({ ...pf, merchantId: e.target.value })} />
          <input className="input" placeholder="Merchant Key" value={pf.merchantKey} onChange={(e) => setPf({ ...pf, merchantKey: e.target.value })} />
          <input className="input" placeholder="Passphrase" value={pf.passphrase} onChange={(e) => setPf({ ...pf, passphrase: e.target.value })} />
          <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!pf.sandbox} onChange={(e) => setPf({ ...pf, sandbox: e.target.checked })} /> Sandbox</label>
          <button type="button" className="btn btn-primary" onClick={savePf}>Save PayFast</button>
        </div>
      )}

      {tab === 'backup' && (
        <div className="card form-grid">
          <button type="button" className="btn btn-primary" onClick={doExport}>Download backup</button>
          <input type="file" accept="application/json" onChange={doImport} />
        </div>
      )}

      {tab === 'about' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>SA Invoice Pro {APP_VERSION}</h3>
          <p className="muted">License: {SA_CONFIG.defaultLicenseServerUrl}</p>
        </div>
      )}
    </div>
  )
}
