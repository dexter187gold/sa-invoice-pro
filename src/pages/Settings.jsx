
import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { PayFast } from '../lib/payfast'
import { exportAll, importAll } from '../lib/db'

export default function Settings() {
  const { company, setCompany, toast, refresh, vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme } = useApp()
  const [tab, setTab] = useState('company')
  const [form, setForm] = useState({
    name: company?.name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    vatNumber: company?.vatNumber || '',
    address: company?.address || '',
    bankName: company?.bankName || '',
    accountNumber: company?.accountNumber || '',
    branchCode: company?.branchCode || '',
  })
  const [pf, setPf] = useState({ merchantId: '', merchantKey: '', passphrase: '', sandbox: true })

  useEffect(() => {
    PayFast.getConfig().then(setPf).catch(() => {})
  }, [])

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        vatNumber: company.vatNumber || '',
        address: company.address || '',
        bankName: company.bankName || '',
        accountNumber: company.accountNumber || '',
        branchCode: company.branchCode || '',
      })
    }
  }, [company])

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

  const savePf = async () => {
    await PayFast.saveConfig(pf)
    toast('PayFast saved', 'success')
  }

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast('Backup downloaded', 'success')
  }

  const doImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!confirm('Import backup? This merges into current data.')) return
      await importAll(data, { wipe: false })
      await refresh()
      toast('Import complete', 'success')
    } catch (err) {
      toast(err.message || 'Import failed', 'error')
    }
  }

  const tabs = [
    ['company', 'Company'],
    ['vat', 'VAT & theme'],
    ['payfast', 'PayFast'],
    ['backup', 'Backup'],
    ['about', 'About'],
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">v{APP_VERSION} · categorized</p>
        </div>
      </div>
      <div className="tabs-row">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'company' && (
        <form className="card form-grid" onSubmit={saveCompany}>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-grid cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">VAT number</label>
              <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="textarea" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-grid cols-3">
            <input className="input" placeholder="Bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <input className="input" placeholder="Account" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            <input className="input" placeholder="Branch" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Save company</button>
        </form>
      )}

      {tab === 'vat' && (
        <div className="card form-grid">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} />
            VAT enabled
          </label>
          <div>
            <label className="label">VAT rate (e.g. 0.15)</label>
            <input className="input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
          </div>
          <button type="button" className="btn btn-secondary" onClick={saveVat}>Save VAT</button>
          <button type="button" className="btn btn-outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Toggle {theme === 'dark' ? 'light' : 'dark'} theme
          </button>
        </div>
      )}

      {tab === 'payfast' && (
        <div className="card form-grid">
          <p className="muted">Sandbox or live Merchant ID / Key from PayFast. Prefer admin push via license server when online.</p>
          <input className="input" placeholder="Merchant ID" value={pf.merchantId} onChange={(e) => setPf({ ...pf, merchantId: e.target.value })} />
          <input className="input" placeholder="Merchant Key" value={pf.merchantKey} onChange={(e) => setPf({ ...pf, merchantKey: e.target.value })} />
          <input className="input" placeholder="Passphrase" value={pf.passphrase} onChange={(e) => setPf({ ...pf, passphrase: e.target.value })} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!pf.sandbox} onChange={(e) => setPf({ ...pf, sandbox: e.target.checked })} />
            Sandbox mode
          </label>
          <button type="button" className="btn btn-primary" onClick={savePf}>Save PayFast</button>
        </div>
      )}

      {tab === 'backup' && (
        <div className="card form-grid">
          <button type="button" className="btn btn-primary" onClick={doExport}>Download JSON backup</button>
          <div>
            <label className="label">Import backup</label>
            <input type="file" accept="application/json,.json" onChange={doImport} />
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>SA Invoice Pro {APP_VERSION}</h3>
          <p className="muted">Modern React + Vite · offline-first IndexedDB · South Africa (ZAR / VAT).</p>
          <p className="muted">License server: {SA_CONFIG.defaultLicenseServerUrl}</p>
          <p className="muted">Legacy 1.0.x static app is included under <code>public/legacy/</code> for reference and fallback feature parity during migration.</p>
        </div>
      )}
    </div>
  )
}
