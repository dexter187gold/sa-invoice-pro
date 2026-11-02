import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { exportAll, replaceAllAtomic, importAll } from '../lib/db'
import { Segmented, PageFade, ConfirmDialog, LoadingButton } from '../components/ui'
import CloudSettings from '../components/CloudSettings'
import ThemePicker from '../components/ThemePicker'
import DeviceAccessPanel from '../components/DeviceAccessPanel'
import {
  listAutoBackups, restoreAutoBackup, downloadAutoBackup, saveAutoBackup,
} from '../lib/localAutoBackup'
import {
  isLoadSheddingMode, setLoadSheddingMode, listOutboundQueue, clearSentFromQueue,
} from '../lib/loadShedding'
import { loadCommsPrefs, saveCommsPrefs, addOptOut } from '../lib/quietHours'
import { loadWhiteLabel, saveWhiteLabel, applyWhiteLabel, fileToLogoDataUrl } from '../lib/whiteLabel'
import { readAccessStatus, normalizedPlan } from '../lib/accessControl'
import Sync from '../lib/sync'

export default function Settings() {
  const {
    user, company, setCompany, toast, refresh,
    vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme,
  } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState('company')
  const [resetPin, setResetPin] = useState('')
  const [resetPhrase, setResetPhrase] = useState('')
  const [accessStatus, setAccessStatus] = useState(null)
  const [ownerDefaults, setOwnerDefaults] = useState(() => {
    try {
      return { currency: 'ZAR', invoicePrefix: 'INV', quoteValidityDays: 14, paymentTermsDays: 7, lowStockThreshold: 3, fiscalYearStart: '03-01', ...JSON.parse(localStorage.getItem('sa_owner_defaults') || '{}') }
    } catch {
      return { currency: 'ZAR', invoicePrefix: 'INV', quoteValidityDays: 14, paymentTermsDays: 7, lowStockThreshold: 3, fiscalYearStart: '03-01' }
    }
  })
  const [form, setForm] = useState({
    name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
    vatNumber: company?.vatNumber || '', address: company?.address || '',
    bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
  })
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [autoBackups, setAutoBackups] = useState([])
  const [shedding, setShedding] = useState(() => isLoadSheddingMode())
  const [comms, setComms] = useState(() => loadCommsPrefs())
  const [optPhone, setOptPhone] = useState('')
  const [wl, setWl] = useState(() => loadWhiteLabel())
  const [navPrefs, setNavPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_nav_prefs') || '{}') } catch { return { layout: 'bottom' } }
  })
  const queueLen = listOutboundQueue().filter((e) => !e.sent).length

  const importDeviceBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const confirmed = window.confirm(
      'Import this device backup and replace the current local workspace? A rollback snapshot will be saved first.'
    )
    if (!confirmed) { e.target.value = ''; return }
    setBusy(true)
    try {
      const raw = JSON.parse(await file.text())
      await saveAutoBackup({ reason: 'pre-device-backup-import' })
      let stats
      try { stats = await replaceAllAtomic(raw, { allowPartial: true }) }
      catch { stats = await importAll(raw, { wipe: true }) }
      await refresh?.({ skipSync: true })
      await refreshAutoBackups()
      toast('Device backup imported: ' + stats.rows + ' records', 'success')
    } catch (error) {
      toast(error?.message || 'Backup import failed', 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const clearWorkspaceSafely = async () => {
    if (resetPhrase.trim() !== 'RESET MY WORKSPACE') return toast('Type RESET MY WORKSPACE exactly to confirm.', 'error')
    if (!/^\d{6,12}$/.test(resetPin)) return toast('Enter your 6–12 digit workspace recovery PIN.', 'error')
    setBusy(true)
    try {
      const snapshot = await saveAutoBackup({ reason: 'pre-account-workspace-reset', label: 'Recovery copy before account workspace reset' })
      try {
        await Sync.resetWorkspace(resetPin, 'RESET MY WORKSPACE')
      } catch (err) {
        // Allow factory preset offline / when server PIN not set
        if (resetPin !== '00000000') throw err
        console.warn('[workspace reset] server rejected; continuing local reset with factory PIN', err)
      }
      await db.clearActiveWorkspace()
      try { if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((key) => caches.delete(key))) } catch {}
      try { if (navigator.serviceWorker?.getRegistrations) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister())) } catch {}
      const audit = { id: crypto.randomUUID(), action: 'account_workspace_reset', at: new Date().toISOString(), actor: user?.email || user?.username || 'signed-in-user', localSnapshotId: snapshot.id, localSnapshotAt: snapshot.at, status: 'completed' }
      try {
        const prior = JSON.parse(localStorage.getItem('sa_workspace_clear_audit') || '[]')
        for (const key of Object.keys(localStorage)) if (/^(saip_|sa_)/i.test(key) && key !== 'sa_workspace_clear_audit') localStorage.removeItem(key)
        localStorage.setItem('sa_workspace_clear_audit', JSON.stringify([audit, ...(Array.isArray(prior) ? prior : [])].slice(0, 50)))
      } catch {}
      setResetPin(''); setResetPhrase(''); setCompany(null)
      await refresh?.({ skipSync: true }); await refreshAutoBackups()
      toast('Your account workspace has been reset. Your sign-in account remains; start again with company setup.', 'success')
      nav('/setup', { replace: true })
    } catch (error) { toast(error?.message || 'Workspace reset failed.', 'error') }
    finally { setBusy(false) }
  }

  const refreshAutoBackups = async () => {
    try { setAutoBackups(await listAutoBackups()) } catch {}
  }

  useEffect(() => { refreshAutoBackups() }, [])

  useEffect(() => {
    let alive = true
    const refreshAccess = () => readAccessStatus().then((value) => { if (alive) setAccessStatus(value) })
    refreshAccess()
    window.addEventListener('sa-license-updated', refreshAccess)
    return () => { alive = false; window.removeEventListener('sa-license-updated', refreshAccess) }
  }, [])

  useEffect(() => {
    setForm({
      name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
      vatNumber: company?.vatNumber || '', address: company?.address || '',
      bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
      registrationNumber: company?.registrationNumber || '',
      payeReference: company?.payeReference || '',
      uifReference: company?.uifReference || '',
      sdlReference: company?.sdlReference || '',
    })
  }, [company])

  useEffect(() => { applyWhiteLabel(loadWhiteLabel()) }, [])

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
    } finally { setBusy(false) }
  }

  const saveWl = (e) => {
    e?.preventDefault?.()
    setWl(saveWhiteLabel(wl))
    toast('White-label applied', 'success')
  }

  const onLogo = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const dataUrl = await fileToLogoDataUrl(f)
      setWl((w) => ({ ...w, logoDataUrl: dataUrl }))
      toast('Logo ready — click Apply white-label', 'success')
    } catch (err) { toast(err?.message || 'Logo failed', 'error') }
  }

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'look', label: 'Look & themes' },
    { id: 'brand', label: 'White-label' },
    { id: 'nav', label: 'Navigation' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'data', label: 'Data' },
    { id: 'comms', label: 'Comms' },
    { id: 'operations', label: 'Owner defaults' },
    { id: 'security', label: 'Security & access' },
  ]

  const plan = normalizedPlan(accessStatus)
  const settingsTabs = tabs.filter((item) => {
    if (!accessStatus?.licensed) return ['company', 'look', 'cloud', 'data'].includes(item.id)
    if (plan === 'solo') return ['company', 'look', 'nav', 'cloud', 'data', 'security'].includes(item.id)
    if (plan === 'shop') return item.id !== 'brand'
    return true
  })
  useEffect(() => {
    if (!settingsTabs.some((item) => item.id === tab)) setTab('company')
  }, [accessStatus?.licensed, plan, tab])

  return (
    <PageFade>
      <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Workspace · v{APP_VERSION} · {SA_CONFIG.productEmail || 'sainvoicepro@gmail.com'}</p>
        </div>
      </div>

      <div className="settings-tabs-scroll" role="tablist" aria-label="Settings sections">
        {settingsTabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`settings-tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>

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
            <input type="checkbox" checked={!!vatEnabled} onChange={(e) => setVatEnabled?.(e.target.checked)} /> Charge VAT on invoices
          </label>
          <label className="label">VAT rate</label>
          <input className="input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate?.(Number(e.target.value))} />
        </div>
      )}

      {tab === 'brand' && (
        <form className="card form-grid" onSubmit={saveWl} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>White-label pilot</h3>
          <label className="label">Brand name</label>
          <input className="input" value={wl.brandName} onChange={(e) => setWl({ ...wl, brandName: e.target.value })} />
          <label className="label">Logo</label>
          <input type="file" accept="image/*" className="input" onChange={onLogo} />
          <label className="label">Accent colour</label>
          <input className="input" value={wl.accent} onChange={(e) => setWl({ ...wl, accent: e.target.value })} />
          <button type="submit" className="btn btn-primary">Apply white-label</button>
        </form>
      )}

      {tab === 'nav' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Navigation</h3>
          <select className="select input" value={navPrefs.layout || 'bottom'} onChange={(e) => applyNavPrefs({ ...navPrefs, layout: e.target.value })}>
            <option value="sidebar">Sidebar</option>
            <option value="bottom">Bottom navigation</option>
            <option value="compact">Compact sidebar</option>
          </select>
        </div>
      )}

      {tab === 'cloud' && <div style={{ marginTop: 12 }}><CloudSettings /></div>}

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
          <label className="label">Import backup JSON</label>
          <input className="input" type="file" accept=".json,application/json" disabled={busy} onChange={importDeviceBackup} />
          <div className="card" style={{ border: '1px solid var(--danger, #b42318)', padding: 14, marginTop: 8 }}>
            <h4 style={{ margin: '0 0 6px', color: 'var(--danger, #b42318)' }}>Reset signed-in account workspace</h4>
            <p className="muted" style={{ fontSize: 12 }}>Resets this owner workspace to first-run setup. Backups are saved first.</p>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
              Factory preset PIN: <code>00000000</code> (eight zeros) if you never set a custom workspace PIN.
            </p>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 8 }} onClick={() => setResetPin('00000000')}>
              Use preset PIN 00000000
            </button>
            <label className="label">Workspace recovery PIN</label>
            <input className="input" type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="6–12 digit PIN (preset 00000000)" />
            <label className="label">Type RESET MY WORKSPACE</label>
            <input className="input" value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)} placeholder="RESET MY WORKSPACE" autoComplete="off" />
            <button type="button" className="btn btn-danger" style={{ marginTop: 10 }} disabled={busy || resetPhrase.trim() !== 'RESET MY WORKSPACE' || !/^\d{6,12}$/.test(resetPin)} onClick={clearWorkspaceSafely}>
              {busy ? 'Saving backup & resetting…' : 'Save backups & reset my account'}
            </button>
          </div>
          <button type="button" className="btn btn-outline" onClick={async () => { await saveAutoBackup({ reason: 'manual' }); await refreshAutoBackups(); toast('Local auto-backup saved', 'success') }}>Save local auto-backup</button>
          {autoBackups.slice(0, 5).map((b) => (
            <div key={b.id} className="muted" style={{ fontSize: 12 }}>{b.at || b.id} — <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadAutoBackup(b.id)}>Download</button></div>
          ))}
        </div>
      )}

      {tab === 'comms' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Comms</h3>
          <p className="muted">Quiet hours and opt-outs.</p>
        </div>
      )}

      {tab === 'operations' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Owner defaults</h3>
          <label className="label">Invoice prefix</label>
          <input className="input" value={ownerDefaults.invoicePrefix} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, invoicePrefix: e.target.value })} />
          <button type="button" className="btn btn-primary" onClick={() => { localStorage.setItem('sa_owner_defaults', JSON.stringify(ownerDefaults)); toast('Defaults saved', 'success') }}>Save defaults</button>
        </div>
      )}

      {tab === 'security' && (
        <div style={{ marginTop: 12 }}>
          <DeviceAccessPanel toast={toast} />
        </div>
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      </div>
    </PageFade>
  )
}
