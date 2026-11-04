import React, { useEffect, useState } from 'react'
import CompanyProfileForm from '../components/CompanyProfileForm'
import VatSelector from '../components/VatSelector'
import { companyToForm, formToCompanyPayload, validateCompanyForm } from '../lib/companyProfile'
import { applyBusinessType } from '../lib/businessTypes'
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
import {
  loadWhiteLabel, saveWhiteLabel, applyWhiteLabel, fileToLogoDataUrl, WHITE_LABEL_DEFAULTS, softAccent,
} from '../lib/whiteLabel'
import { readAccessStatus, normalizedPlan } from '../lib/accessControl'
import Sync from '../lib/sync'

const ACCENT_PRESETS = ['#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#059669', '#0ea5e9']

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
  const [form, setForm] = useState(() => companyToForm(company))
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
    setForm(companyToForm(company))
  }, [company])

  useEffect(() => { applyWhiteLabel(loadWhiteLabel()) }, [])

  const applyNavPrefs = (next) => {
    setNavPrefs(next)
    try { localStorage.setItem('sa_nav_prefs', JSON.stringify(next)) } catch {}
    window.dispatchEvent(new CustomEvent('sa-nav-prefs', { detail: next }))
  }

  const saveCompany = async (e) => {
    e?.preventDefault?.()
    const errors = validateCompanyForm(form)
    if (errors.length) return toast(errors[0], 'error')
    setBusy(true)
    try {
      const payload = formToCompanyPayload(form)
      const row = { ...(company || {}), ...payload, updatedAt: new Date().toISOString() }
      if (company?.id) await db.put(db.STORES.company || 'company', row)
      else await db.add(db.STORES.company || 'company', row)
      setCompany?.(row)
      try { applyBusinessType(form.businessType) } catch {}
      await refresh?.()
      toast('Company saved', 'success')
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    } finally { setBusy(false) }
  }

  const saveWl = (e) => {
    e?.preventDefault?.()
    const next = saveWhiteLabel({
      ...wl,
      accentSoft: wl.accent ? softAccent(wl.accent) : '',
    })
    setWl(next)
    toast('White-label applied — accent & name update across the desk', 'success')
  }

  const resetWl = () => {
    const next = saveWhiteLabel({ ...WHITE_LABEL_DEFAULTS })
    setWl(next)
    toast('White-label reset to product defaults', 'info')
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
    { id: 'brand', label: 'WhiteWhite-label' },
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
    if (plan === 'shop') return true // pilot: allow white-label on shop+
    return true
  })
  useEffect(() => {
    if (!settingsTabs.some((item) => item.id === tab)) setTab('company')
  }, [accessStatus?.licensed, plan, tab])

  const accentHex = (() => {
    const a = String(wl.accent || '').trim()
    if (/^#?[0-9a-fA-F]{6}$/.test(a.replace('#', ''))) return a.startsWith('#') ? a : `#${a}`
    return '#0d9488'
  })()

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
        <form className="card" onSubmit={saveCompany} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Company & account profile</h3>
          <p className="muted" style={{ marginTop: 0 }}>Legal identity, contact, tax, banking and workspace details for your business type.</p>
          <CompanyProfileForm form={form} setForm={setForm} mode="full" showModuleSetup toast={toast} refresh={refresh} />
          <LoadingButton loading={busy} className="btn btn-primary" style={{ marginTop: 12 }}>{busy ? 'Saving…' : 'Save company profile'}</LoadingButton>
        </form>
      )}

      {tab === 'look' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Appearance</h3>
          <button type="button" className="btn btn-outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
          <ThemePicker setTheme={setTheme} toast={toast} />
          <VatSelector
            enabled={!!vatEnabled}
            rate={vatRate}
            onChange={({ enabled, rate }) => {
              setVatEnabled?.(enabled)
              setVatRate?.(rate)
              try {
                localStorage.setItem('sa_vat_enabled', enabled ? '1' : '0')
                localStorage.setItem('sa_vat_rate', String(rate ?? 15))
              } catch {}
            }}
          />
        </div>
      )}

      {tab === 'brand' && (
        <form className="card form-grid" onSubmit={saveWl} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>White-label pilot</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Brand the desk for your shop or reseller. Accent drives primary buttons; name appears in the shell header.
            Stored locally on this device (sync later).
          </p>

          <div
            className="wl-preview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 12,
              border: '1px solid var(--border, #334155)',
              background: 'var(--surface-2, rgba(15,23,42,.4))',
              marginBottom: 8,
            }}
          >
            {wl.logoDataUrl ? (
              <img src={wl.logoDataUrl} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: accentHex }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block' }}>{wl.brandName?.trim() || 'SA Invoice Pro'}</strong>
              <span className="muted" style={{ fontSize: 12 }}>{wl.portalTagline?.trim() || 'Client portal'}</span>
            </div>
            <button type="button" className="btn btn-sm" style={{ background: accentHex, color: '#fff', border: 0 }}>Sample CTA</button>
          </div>

          <label className="label">Brand name</label>
          <input
            className="input"
            value={wl.brandName}
            onChange={(e) => setWl({ ...wl, brandName: e.target.value })}
            placeholder="e.g. Midrand PC Desk"
          />

          <label className="label">Portal tagline</label>
          <input
            className="input"
            value={wl.portalTagline || ''}
            onChange={(e) => setWl({ ...wl, portalTagline: e.target.value })}
            placeholder="e.g. Track jobs & pay invoices"
          />

          <label className="label">Logo (optional)</label>
          <input type="file" accept="image/*" className="input" onChange={onLogo} />
          {wl.logoDataUrl ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setWl({ ...wl, logoDataUrl: '' })}>
              Clear logo
            </button>
          ) : null}

          <label className="label">Accent colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="color"
              value={accentHex}
              onChange={(e) => setWl({ ...wl, accent: e.target.value })}
              aria-label="Accent colour picker"
              style={{ width: 44, height: 36, padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
            />
            <input
              className="input"
              value={wl.accent}
              onChange={(e) => setWl({ ...wl, accent: e.target.value })}
              placeholder="#0d9488"
              style={{ maxWidth: 140 }}
            />
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setWl({ ...wl, accent: c })}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: wl.accent === c || accentHex === c ? '2px solid #fff' : '1px solid var(--border)',
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!wl.hidePoweredBy}
              onChange={(e) => setWl({ ...wl, hidePoweredBy: e.target.checked })}
            />
            <span>Hide “Powered by SA Invoice Pro” on portal / PDFs (pilot)</span>
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <button type="submit" className="btn btn-primary">Apply white-label</button>
            <button type="button" className="btn btn-outline" onClick={resetWl}>Reset defaults</button>
            <Link className="btn btn-outline" to="/team">Team & seats</Link>
          </div>
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
