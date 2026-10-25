import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { PayFast } from '../lib/payfast'
import { exportAll, importAll } from '../lib/db'
import { DEFAULT_LAYOUT, loadInvoiceLayout, saveInvoiceLayout, mergeLayout } from '../lib/invoiceLayout'
import { TEMPLATE_PRESETS } from '../lib/pdfTemplate'
import { Segmented, PageFade, ConfirmDialog, LoadingButton } from '../components/ui'
import { loadDemoWorkspace } from '../lib/demoData'
import CloudSettings from '../components/CloudSettings'
import ThemePicker from '../components/ThemePicker'
import {
  listAutoBackups, restoreAutoBackup, downloadAutoBackup, saveAutoBackup,
  getAutoBackupMeta,
} from '../lib/localAutoBackup'

export default function Settings() {
  const {
    company, setCompany, toast, refresh,
    vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme, density, setDensity,
  } = useApp()
  const [tab, setTab] = useState('company')
  const [form, setForm] = useState({
    name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
    vatNumber: company?.vatNumber || '', address: company?.address || '',
    bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
  })
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [navPrefs, setNavPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}') } catch { return { layout: 'bottom' } }
  })

  useEffect(() => {
    setForm({
      name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
      vatNumber: company?.vatNumber || '', address: company?.address || '',
      bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
    })
  }, [company])

  const applyNavPrefs = (next) => {
    setNavPrefs(next)
    try { localStorage.setItem('sa_nav_prefs', JSON.stringify(next)) } catch {}
    window.dispatchEvent(new CustomEvent('sa-nav-prefs', { detail: next }))
  }

  const saveCompany = async (e) => {
    e?.preventDefault?.()
    setBusy(true)
    try {
      const row = { ...(company || {}), ...form, updatedAt: new Date().toISOString() }
      if (company?.id) await db.put(db.STORES.company || 'company', row)
      else await db.add(db.STORES.company || 'company', row)
      setCompany?.(row)
      await refresh?.()
      toast('Company saved', 'success')
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'look', label: 'Look & themes' },
    { id: 'nav', label: 'Navigation' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'data', label: 'Data' },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Workspace · v{APP_VERSION}</p>
        </div>
      </div>

      <Segmented options={tabs} value={tab} onChange={setTab} />

      {tab === 'company' && (
        <form className="card form-grid" onSubmit={saveCompany} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Company profile</h3>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label className="label">VAT number</label>
          <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label className="label">Bank name</label>
          <input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <label className="label">Account number</label>
          <input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          <label className="label">Branch code</label>
          <input className="input" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} />
          <LoadingButton loading={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save company'}</LoadingButton>
        </form>
      )}

      {tab === 'look' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Appearance</h3>
          <button type="button" className="btn btn-outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
          <ThemePicker setTheme={setTheme} toast={toast} />
          <label className="label">VAT enabled</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!vatEnabled} onChange={(e) => setVatEnabled?.(e.target.checked)} />
            Charge VAT on invoices
          </label>
          <label className="label">VAT rate</label>
          <input className="input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate?.(Number(e.target.value))} />
        </div>
      )}

      {tab === 'nav' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Navigation & layout</h3>
          <label className="label">Menu layout</label>
          <select className="select input" value={navPrefs.layout || 'bottom'} onChange={(e) => applyNavPrefs({ ...navPrefs, layout: e.target.value })}>
            <option value="sidebar">Sidebar</option>
            <option value="bottom">Bottom navigation (mobile-friendly)</option>
            <option value="compact">Compact sidebar</option>
          </select>
          <label className="label">Sections</label>
          <select className="select input" value={navPrefs.sections || 'grouped'} onChange={(e) => applyNavPrefs({ ...navPrefs, sections: e.target.value })}>
            <option value="grouped">Grouped</option>
            <option value="flat">Flat list</option>
          </select>
          <p className="muted" style={{ fontSize: 12 }}>Bottom bar changes with the page (invoices, jobs, settings, …).</p>
        </div>
      )}

      {tab === 'cloud' && (
        <div style={{ marginTop: 12 }}>
          <CloudSettings />
        </div>
      )}

      {tab === 'data' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Data & backup</h3>
          <button type="button" className="btn btn-outline" onClick={async () => {
            const data = await exportAll()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            toast('Backup downloaded', 'success')
          }}>Download backup JSON</button>
          <button type="button" className="btn btn-outline" onClick={async () => {
            try {
              await saveAutoBackup({ reason: 'manual' })
              toast('Local snapshot saved', 'success')
            } catch (e) { toast(e?.message || 'Backup failed', 'error') }
          }}>Save local auto-backup</button>
          <button type="button" className="btn btn-outline" onClick={async () => {
            try {
              await downloadAutoBackup()
              toast('Auto-backup downloaded', 'success')
            } catch (e) { toast(e?.message || 'Nothing to download', 'error') }
          }}>Download last auto-backup</button>
          <p className="muted" style={{ fontSize: 12 }}>Cloud profiles restore on sign-in when sync is configured.</p>
          <p className="muted" style={{ fontSize: 11 }}>Sync: {SA_CONFIG.syncServerUrl}</p>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { confirm?.action?.(); setConfirm(null) }}
      />
    </PageFade>
  )
}
