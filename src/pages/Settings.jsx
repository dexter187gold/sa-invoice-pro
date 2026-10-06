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
  const [look, setLook] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_template') || '{}') } catch { return {} }
  })
  const [invLayout, setInvLayout] = useState(DEFAULT_LAYOUT)

  useEffect(() => { PayFast.getConfig().then(setPf).catch(() => {}) }, [])
  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', email: company.email || '', phone: company.phone || '',
        vatNumber: company.vatNumber || '', address: company.address || '',
        bankName: company.bankName || '', accountNumber: company.accountNumber || '', branchCode: company.branchCode || '',
      })
    }
  }, [company])
  useEffect(() => { loadInvoiceLayout().then(setInvLayout).catch(() => {}) }, [])

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
    toast('VAT settings saved', 'success')
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
    toast('Template applied', 'success')
  }
  const patchInv = (patch) => setInvLayout((L) => mergeLayout({ ...L, ...patch }))
  const saveInvLayout = async () => {
    const saved = await saveInvoiceLayout(invLayout)
    setInvLayout(saved)
    toast('Invoicing layout saved', 'success')
  }
  const resetInvLayout = async () => {
    const saved = await saveInvoiceLayout({ ...DEFAULT_LAYOUT })
    setInvLayout(saved)
    toast('Invoicing layout reset', 'success')
  }

  const tabs = [
    ['company', 'Company'],
    ['invoicing', 'Invoicing'],
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
        <div className="card form-grid">
          <h3 style={{ marginTop: 0 }}>Invoicing layout & editor</h3>
          <p className="muted" style={{ marginTop: 0 }}>Applies to the invoice form and PDF. Save once — new invoices pick this up.</p>

          <h4 style={{ marginBottom: 4 }}>Form layout</h4>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Form density</label>
              <select className="select" value={invLayout.formDensity} onChange={(e) => patchInv({ formDensity: e.target.value })}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
            <div>
              <label className="label">Form font size ({invLayout.formFontSize}px)</label>
              <input className="input" type="range" min={12} max={18} value={invLayout.formFontSize} onChange={(e) => patchInv({ formFontSize: Number(e.target.value) })} />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!invLayout.showLayoutPanel} onChange={(e) => patchInv({ showLayoutPanel: e.target.checked })} />
            Show layout panel on invoice editor
          </label>

          <h4 style={{ marginBottom: 4 }}>PDF document</h4>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Default template</label>
              <select className="select" value={invLayout.defaultTemplateId} onChange={(e) => patchInv({ defaultTemplateId: e.target.value })}>
                {TEMPLATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Header style</label>
              <select className="select" value={invLayout.headerStyle} onChange={(e) => patchInv({ headerStyle: e.target.value })}>
                <option value="modern">Modern (green brand)</option>
                <option value="classic">Classic</option>
                <option value="minimal">Minimal</option>
                <option value="banner">Strong banner</option>
              </select>
            </div>
            <div>
              <label className="label">PDF body font ({invLayout.pdfFontSize}pt)</label>
              <input className="input" type="range" min={7} max={12} step={0.5} value={invLayout.pdfFontSize} onChange={(e) => patchInv({ pdfFontSize: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">PDF title size ({invLayout.pdfTitleSize}pt)</label>
              <input className="input" type="range" min={10} max={18} value={invLayout.pdfTitleSize} onChange={(e) => patchInv({ pdfTitleSize: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Accent colour</label>
              <input className="input" type="color" value={invLayout.accentHex || '#007A4D'} onChange={(e) => patchInv({ accentHex: e.target.value })} />
            </div>
            <div>
              <label className="label">Side margin (mm)</label>
              <input className="input" type="number" min={10} max={24} value={invLayout.marginMm} onChange={(e) => patchInv({ marginMm: Number(e.target.value) })} />
            </div>
          </div>

          <div className="form-grid cols-2">
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showClientGrid} onChange={(e) => patchInv({ showClientGrid: e.target.checked })} /> Client / devices grid</label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showDevices} onChange={(e) => patchInv({ showDevices: e.target.checked })} /> Devices field</label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showServiceType} onChange={(e) => patchInv({ showServiceType: e.target.checked })} /> Service type field</label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showTerms} onChange={(e) => patchInv({ showTerms: e.target.checked })} /> T&Cs on PDF</label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showAcceptance} onChange={(e) => patchInv({ showAcceptance: e.target.checked })} /> Acceptance block</label>
            <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={!!invLayout.showBankDetails} onChange={(e) => patchInv({ showBankDetails: e.target.checked })} /> Bank details</label>
          </div>

          <label className="label">Default notes (new invoices)</label>
          <textarea className="textarea" rows={2} value={invLayout.defaultNotes || ''} onChange={(e) => patchInv({ defaultNotes: e.target.value })} placeholder="Thank you for your business…" />

          <label className="label">Default payment note (PDF)</label>
          <textarea className="textarea" rows={2} value={invLayout.defaultPaymentNote || ''} onChange={(e) => patchInv({ defaultPaymentNote: e.target.value })} placeholder="Payment due on completion. EFT / cash / card." />

          <label className="label">Custom footer line</label>
          <input className="input" value={invLayout.footerText || ''} onChange={(e) => patchInv({ footerText: e.target.value })} placeholder="Optional extra footer text" />

          <div className="card" style={{ background: 'var(--bg)', borderColor: invLayout.accentHex || '#007A4D' }}>
            <strong>Live preview</strong>
            <div className="muted" style={{ fontSize: invLayout.formFontSize, marginTop: 6 }}>
              Density: {invLayout.formDensity} · Header: {invLayout.headerStyle} · Template: {invLayout.defaultTemplateId}
            </div>
            <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: invLayout.accentHex || '#007A4D' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={saveInvLayout}>Save invoicing layout</button>
            <button type="button" className="btn btn-outline" onClick={resetInvLayout}>Reset defaults</button>
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
          <h3 style={{ marginTop: 0 }}>App look (UI chrome)</h3>
          <label className="label">Accent</label>
          <input className="input" type="color" value={look.accent || '#007A4D'} onChange={(e) => applyLook({ ...look, accent: e.target.value })} />
          <label className="label">Corner radius</label>
          <input className="input" type="number" min="0" max="28" value={look.radius || 14} onChange={(e) => applyLook({ ...look, radius: Number(e.target.value) })} />
          <label className="label">Font</label>
          <select className="select" value={look.font || ''} onChange={(e) => applyLook({ ...look, font: e.target.value })}>
            <option value="">System</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="ui-monospace, monospace">Mono</option>
          </select>
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
          <p className="muted">License server: {SA_CONFIG.defaultLicenseServerUrl}</p>
        </div>
      )}
    </div>
  )
}
