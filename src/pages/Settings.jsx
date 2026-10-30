import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { exportAll, replaceAllAtomic, importAll } from '../lib/db'
import { Segmented, PageFade, ConfirmDialog, LoadingButton } from '../components/ui'
import CloudSettings from '../components/CloudSettings'
import ThemePicker from '../components/ThemePicker'
import {
  listAutoBackups, restoreAutoBackup, downloadAutoBackup, saveAutoBackup,
} from '../lib/localAutoBackup'
import {
  isLoadSheddingMode, setLoadSheddingMode, listOutboundQueue, clearSentFromQueue,
} from '../lib/loadShedding'
import { loadCommsPrefs, saveCommsPrefs, addOptOut } from '../lib/quietHours'
import { loadWhiteLabel, saveWhiteLabel, applyWhiteLabel, fileToLogoDataUrl } from '../lib/whiteLabel'

export default function Settings() {
  const {
    company, setCompany, toast, refresh,
    vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme,
  } = useApp()
  const [tab, setTab] = useState('company')
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
      'Import this device backup and replace the current local workspace? A rollback snapshot will be saved first. Sections missing from a profile-only backup will be empty so you can update them yourself.'
    )
    if (!confirmed) {
      e.target.value = ''
      return
    }
    setBusy(true)
    try {
      const raw = JSON.parse(await file.text())
      await saveAutoBackup({ reason: 'pre-device-backup-import' })
      let stats
      try {
        stats = await replaceAllAtomic(raw, { allowPartial: true })
      } catch (primaryErr) {
        console.warn('[settings import] atomic failed', primaryErr)
        stats = await importAll(raw, { wipe: true })
      }
      await refresh?.({ skipSync: true })
      await refreshAutoBackups()
      toast('Device backup imported: ' + stats.rows + ' records across ' + (stats.stores || '?') + ' sections. Review company profile, then sign in and Sync Now.', 'success')
    } catch (error) {
      toast(error?.message || 'Backup import failed; the current workspace was not replaced.', 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const refreshAutoBackups = async () => {
    try { setAutoBackups(await listAutoBackups()) } catch (error) { console.warn('[settings] backups', error) }
  }

  useEffect(() => { refreshAutoBackups() }, [])

  useEffect(() => {
    setForm({
      name: company?.name || '', email: company?.email || '', phone: company?.phone || '',
      vatNumber: company?.vatNumber || '', address: company?.address || '',
      bankName: company?.bankName || '', accountNumber: company?.accountNumber || '', branchCode: company?.branchCode || '',
    })
  }, [company])

  useEffect(() => {
    applyWhiteLabel(loadWhiteLabel())
  }, [])

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

  const saveWl = (e) => {
    e?.preventDefault?.()
    const next = saveWhiteLabel(wl)
    setWl(next)
    toast('White-label applied', 'success')
  }

  const onLogo = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const dataUrl = await fileToLogoDataUrl(f)
      setWl((w) => ({ ...w, logoDataUrl: dataUrl }))
      toast('Logo ready — click Apply white-label', 'success')
    } catch (err) {
      toast(err?.message || 'Logo failed', 'error')
    }
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
        {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`settings-tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
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
          <label className="label">Company registration number</label>
          <input className="input" value={form.registrationNumber || ''} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
          <label className="label">SARS PAYE reference</label>
          <input className="input" value={form.payeReference || ''} onChange={(e) => setForm({ ...form, payeReference: e.target.value })} />
          <label className="label">UIF reference</label>
          <input className="input" value={form.uifReference || ''} onChange={(e) => setForm({ ...form, uifReference: e.target.value })} />
          <label className="label">SDL reference</label>
          <input className="input" value={form.sdlReference || ''} onChange={(e) => setForm({ ...form, sdlReference: e.target.value })} />
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

      {tab === 'brand' && (
        <form className="card form-grid" onSubmit={saveWl} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>White-label pilot</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Brand name, accent, logo (resized to ~128px), portal tagline. Logo appears in the shell mark.
          </p>
          <label className="label">Brand name</label>
          <input className="input" value={wl.brandName} onChange={(e) => setWl({ ...wl, brandName: e.target.value })} placeholder="e.g. Cape Tech Desk" />
          <label className="label">Logo (PNG/JPG)</label>
          <input type="file" accept="image/*" className="input" onChange={onLogo} />
          {wl.logoDataUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={wl.logoDataUrl} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setWl({ ...wl, logoDataUrl: '' })}>Remove logo</button>
            </div>
          ) : null}
          <label className="label">Accent colour (hex)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" value={wl.accent} onChange={(e) => setWl({ ...wl, accent: e.target.value })} placeholder="#0ea5e9" style={{ flex: 1 }} />
            <input type="color" value={/^#?[0-9a-fA-F]{6}$/.test(String(wl.accent || '').replace('#', '')) ? (wl.accent.startsWith('#') ? wl.accent : `#${wl.accent}`) : '#10b981'} onChange={(e) => setWl({ ...wl, accent: e.target.value })} title="Pick accent" />
          </div>
          <label className="label">Portal tagline</label>
          <input className="input" value={wl.portalTagline} onChange={(e) => setWl({ ...wl, portalTagline: e.target.value })} placeholder="Secure invoices & quotes" />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!wl.hidePoweredBy} onChange={(e) => setWl({ ...wl, hidePoweredBy: e.target.checked })} />
            Hide “Powered by SA Invoice Pro” on client portal
          </label>
          <button type="submit" className="btn btn-primary">Apply white-label</button>
          <button type="button" className="btn btn-outline" onClick={() => {
            const cleared = saveWhiteLabel({ brandName: '', accent: '', accentSoft: '', hidePoweredBy: false, portalTagline: '', logoDataUrl: '' })
            setWl(cleared)
            toast('White-label cleared — re-pick theme if colours look off', 'info')
          }}>Reset white-label</button>
        </form>
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
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={shedding} onChange={(e) => {
              const on = e.target.checked
              setLoadSheddingMode(on)
              setShedding(on)
              toast(on ? 'Load-shedding mode ON — queue outbound' : 'Load-shedding mode off', 'info')
            }} />
            Load-shedding mode (queue WA/SMS when offline / grid down)
          </label>
          <p className="muted" style={{ fontSize: 12 }}>Queued outbound: {queueLen}</p>
          <button type="button" className="btn btn-outline" onClick={() => { clearSentFromQueue(); toast('Cleared sent queue items', 'success') }}>Clear sent from queue</button>
          <button type="button" className="btn btn-outline" onClick={async () => {
            const data = await exportAll()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `sa-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            toast('Backup downloaded', 'success')
          }}>Download backup JSON</button>

          <label className="label">Import profile backup JSON from this device</label>
          <input className="input" type="file" accept=".json,application/json" disabled={busy} onChange={importDeviceBackup} />
          <p className="muted" style={{ fontSize: 12 }}>
            Imports your saved profile using atomic replace, with wipe-merge fallback if the file shape is incomplete.
            A rollback snapshot is saved first. After import, sign in and run Sync Now to publish to cloud.
          </p>
          <button type="button" className="btn btn-outline" onClick={async () => {
            try {
              await saveAutoBackup({ reason: 'manual' })
              await refreshAutoBackups()
              toast('Local snapshot saved', 'success')
            } catch (e) { toast(e?.message || 'Backup failed', 'error') }
          }}>Save local auto-backup</button>
          <button type="button" className="btn btn-outline" onClick={async () => {
            try {
              await downloadAutoBackup()
              toast('Auto-backup downloaded', 'success')
            } catch (e) { toast(e?.message || 'Nothing to download', 'error') }
          }}>Download last auto-backup</button>
          <div className="settings-control-card" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 6px' }}>Local recovery snapshots</h4>
            <p className="muted" style={{ fontSize: 12 }}>Restore replaces the entire local workspace with the selected snapshot.</p>
            {autoBackups.length ? autoBackups.map((snap) => (
              <div key={snap.id} className="settings-shortcut-row" style={{ alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{snap.label || 'Local snapshot'}</strong>
                  <span>{new Date(snap.at || snap.createdAt).toLocaleString()} · {(snap.counts?.invoices || 0)} invoices · {(snap.counts?.clients || 0)} clients</span>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadAutoBackup(snap.id).catch((e) => toast(e?.message || 'Download failed', 'error'))}>Download</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm({
                  title: 'Replace this workspace with the selected snapshot?',
                  message: 'This replaces all local workspace records. A rollback snapshot of the current workspace will be saved first.',
                  danger: true,
                  confirmLabel: 'Restore snapshot',
                  action: async () => {
                    try {
                      await restoreAutoBackup(snap.id)
                      await refresh?.({ skipSync: true })
                      await refreshAutoBackups()
                      toast('Snapshot restored', 'success')
                    } catch (e) {
                      toast(e?.message || 'Restore failed', 'error')
                    } finally {
                      setConfirm(null)
                    }
                  },
                })}>Restore</button>
              </div>
            )) : <p className="muted" style={{ fontSize: 13 }}>No local snapshots yet.</p>}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Owner recovery: <Link to="/settings">keep off-device backups</Link> as well as cloud sync.
          </p>
        </div>
      )}

      {tab === 'comms' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Communications</h3>
          <label className="label">Quiet hours start (HH:MM)</label>
          <input className="input" value={comms.quietStart || ''} onChange={(e) => setComms({ ...comms, quietStart: e.target.value })} placeholder="20:00" />
          <label className="label">Quiet hours end (HH:MM)</label>
          <input className="input" value={comms.quietEnd || ''} onChange={(e) => setComms({ ...comms, quietEnd: e.target.value })} placeholder="07:00" />
          <label className="label">Opt-out phone</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={optPhone} onChange={(e) => setOptPhone(e.target.value)} placeholder="27…" />
            <button type="button" className="btn btn-outline" onClick={() => { addOptOut(optPhone); setOptPhone(''); toast('Opt-out saved', 'success') }}>Add</button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => { saveCommsPrefs(comms); toast('Comms prefs saved', 'success') }}>Save comms prefs</button>
        </div>
      )}

      {tab === 'operations' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Owner defaults</h3>
          <label className="label">Invoice prefix</label>
          <input className="input" value={ownerDefaults.invoicePrefix} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, invoicePrefix: e.target.value })} />
          <label className="label">Quote validity (days)</label>
          <input className="input" type="number" value={ownerDefaults.quoteValidityDays} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, quoteValidityDays: Number(e.target.value) })} />
          <label className="label">Payment terms (days)</label>
          <input className="input" type="number" value={ownerDefaults.paymentTermsDays} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, paymentTermsDays: Number(e.target.value) })} />
          <label className="label">Low stock threshold</label>
          <input className="input" type="number" value={ownerDefaults.lowStockThreshold} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, lowStockThreshold: Number(e.target.value) })} />
          <button type="button" className="btn btn-primary" onClick={() => { try { localStorage.setItem('sa_owner_defaults', JSON.stringify(ownerDefaults)); toast('Owner defaults saved on this device', 'success') } catch { toast('Could not save defaults on this device', 'error') } }}>Save owner defaults</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Security & access</h3>
          <div className="settings-shortcut-row"><div><strong>Data export & recovery</strong><span>Create a backup before major changes or device replacement.</span></div><button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('data')}>Open data & backup</button></div>
          <div className="settings-shortcut-row"><div><strong>Cloud account</strong><span>Sign-in, team seats and workspace sync.</span></div><button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('cloud')}>Open cloud</button></div>
          <p className="muted" style={{ fontSize: 11 }}>Recommended owner checks: keep backups off-device as well, limit team access to job duties, review opt-outs before messaging, and never store credentials in document notes.</p>
        </div>
      )}

      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        <span>Review company identity, VAT defaults, backups, communications and cloud sync whenever your business details change.</span>
      </p>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
      />
      </div>
    </PageFade>
  )
}
