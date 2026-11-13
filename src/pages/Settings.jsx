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
import { readProfilePrefs, saveProfilePrefs } from '../lib/profilePreferences'

const ACCENT_PRESETS = ['#0d9488', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#059669', '#0ea5e9']

export default function Settings() {
  const {
    user, company, setCompany, toast, refresh,
    vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme,
  } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState('company')
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => { const n = Number(readProfilePrefs(user).autoLockMinutes || 5); return [5, 15, 30].includes(n) ? String(n) : '5' })
  const [resetPin, setResetPin] = useState('')
  const [resetPhrase, setResetPhrase] = useState('')
  const [resetCurrentPassword, setResetCurrentPassword] = useState('')
  const [resetPinConfirm, setResetPinConfirm] = useState('')
  const [profilePrefs, setProfilePrefs] = useState(() => {
    const identity = String(user?.id || user?.email || user?.username || 'local').trim().toLowerCase()
    try { return { ...readProfilePrefs(user) } } catch { return {} }
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [vatDraft, setVatDraft] = useState(() => ({ enabled: !!vatEnabled, rate: Number(vatRate ?? 0.15) * 100 }))
  const [vatSaving, setVatSaving] = useState(false)
  const [accessStatus, setAccessStatus] = useState(null)
  const [ownerDefaults, setOwnerDefaults] = useState(() => {
    try {
      return { currency: 'ZAR', invoicePrefix: 'INV', quoteValidityDays: 14, paymentTermsDays: 7, lowStockThreshold: 3, fiscalYearStart: '03-01', invoiceDocumentType: 'tax-invoice', jobCardType: 'it-repair', ...JSON.parse(localStorage.getItem('sa_owner_defaults') || '{}') }
    } catch {
      return { currency: 'ZAR', invoicePrefix: 'INV', quoteValidityDays: 14, paymentTermsDays: 7, lowStockThreshold: 3, fiscalYearStart: '03-01', invoiceDocumentType: 'tax-invoice', jobCardType: 'it-repair' }
    }
  })
  const [form, setForm] = useState(() => companyToForm(company))
  useEffect(() => { setVatDraft({ enabled: !!vatEnabled, rate: Number(vatRate ?? 0.15) * 100 }) }, [vatEnabled, vatRate])
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
    if (resetPin !== resetPinConfirm) return toast('Recovery PIN entries do not match.', 'error')
    if (!resetCurrentPassword) return toast('Confirm your current account password.', 'error')
    setBusy(true)
    try {
      const snapshot = await saveAutoBackup({ reason: 'pre-account-workspace-reset', label: 'Recovery copy before account workspace reset' })
      await Sync.setWorkspaceResetPin(resetPin, resetPinConfirm, resetCurrentPassword)
      await Sync.resetWorkspace(resetPin, 'RESET MY WORKSPACE')
      await db.clearActiveWorkspace()
      const audit = { id: crypto.randomUUID(), action: 'account_workspace_reset', at: new Date().toISOString(), actor: user?.email || user?.username || 'signed-in-user', localSnapshotId: snapshot.id, localSnapshotAt: snapshot.at, status: 'completed' }
      try {
        const prior = JSON.parse(localStorage.getItem('sa_workspace_clear_audit') || '[]')
        localStorage.setItem('sa_workspace_clear_audit', JSON.stringify([audit, ...(Array.isArray(prior) ? prior : [])].slice(0, 50)))
      } catch {}
      setResetPin(''); setResetPinConfirm(''); setResetCurrentPassword(''); setResetPhrase(''); setCompany(null)
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

  const saveVatPreferences = async () => {
    const percent = Number(vatDraft.rate)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return toast('Enter a VAT rate between 0 and 100%', 'error')
    setVatSaving(true)
    try {
      const decimalRate = percent / 100
      await db.setSetting('vatEnabled', !!vatDraft.enabled)
      await db.setSetting('vatRate', decimalRate)
      setVatEnabled?.(!!vatDraft.enabled)
      setVatRate?.(decimalRate)
      try {
        localStorage.setItem('sa_vat_enabled', vatDraft.enabled ? '1' : '0')
        localStorage.setItem('sa_vat_rate', String(percent))
      } catch {}
      await refresh?.()
      toast('VAT preferences saved for invoices and quotes', 'success')
    } catch (err) {
      toast(err?.message || 'VAT preferences could not be saved', 'error')
    } finally { setVatSaving(false) }
  }

  const saveCompany = async (e) => {
    e?.preventDefault?.()
    const errors = validateCompanyForm(form)
    if (errors.length) return toast(errors[0], 'error')
    setBusy(true)
    try {
      const payload = { ...formToCompanyPayload(form), updatedAt: new Date().toISOString() }
      // Use the shared company persistence path used by first-run setup. It
      // preserves the active company ID and avoids creating a second profile
      // when Settings is opened before AppContext has finished hydrating.
      const row = await db.saveCompany(payload)
      await db.setActiveCompany(row.id)
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
    { id: 'profile', label: 'Personal Profile' },
    { id: 'company', label: 'Company' },
    { id: 'look', label: 'Look & themes' },
    { id: 'brand', label: 'White-label' },
    { id: 'nav', label: 'Navigation' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'data', label: 'Data' },
    { id: 'comms', label: 'Comms' },
    { id: 'operations', label: 'Invoice & job settings' },
    { id: 'security', label: 'Security & access' },
  ]

  const plan = normalizedPlan(accessStatus)
  const settingsTabs = tabs.filter((item) => {
    if (!accessStatus?.licensed) return ['profile', 'company', 'look', 'cloud', 'data', 'security'].includes(item.id)
    if (plan === 'solo') return ['profile', 'company', 'look', 'nav', 'cloud', 'data', 'security'].includes(item.id)
    if (plan === 'shop') return true
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

      <div role="tablist" aria-label="Settings sections" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginTop: 14 }}>
        {settingsTabs.map((item) => <button key={item.id} type="button" role="tab" data-testid={`settings-tab-${item.id}`} aria-label={item.label} aria-selected={tab === item.id} onClick={() => setTab(item.id)} style={{ minHeight: 58, padding: '12px 14px', textAlign: 'left', borderRadius: 12, border: tab === item.id ? '2px solid var(--accent, #0d9488)' : '1px solid var(--border, #334155)', background: tab === item.id ? 'var(--surface-2, rgba(13,148,136,.12))' : 'var(--surface, transparent)', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{item.label}<span style={{ display: 'block', fontSize: 11, fontWeight: 400, opacity: .7, marginTop: 3 }}>{item.id === 'company' ? 'Business profile' : item.id === 'data' ? 'Backup & recovery' : item.id === 'security' ? 'Privacy & device access' : item.id === 'operations' ? 'Invoice & job defaults' : 'Configure settings'}</span></button>)}
      </div>


      {tab === 'profile' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Personal Profile & preferences</h3>
          <p className="muted" style={{ marginTop: 0 }}>These preferences are saved separately for the signed-in user on this device. They do not change company tax, banking or branding details.</p>
          <label className="label">Signed-in account</label>
          <input className="input" value={user?.email || user?.username || 'Local account'} readOnly />
          <label className="label">Preferred display name</label>
          <input className="input" value={profilePrefs.displayName || user?.name || ''} onChange={(e) => setProfilePrefs({ ...profilePrefs, displayName: e.target.value })} placeholder="Name shown in your profile" />
          <label className="label">Preferred language</label>
          <select className="select input" value={profilePrefs.language || 'en-ZA'} onChange={(e) => setProfilePrefs({ ...profilePrefs, language: e.target.value })}><option value="en-ZA">English (South Africa)</option><option value="af-ZA">Afrikaans</option><option value="zu-ZA">isiZulu</option><option value="xh-ZA">isiXhosa</option></select>
          <label className="label">Time zone</label>
          <select className="select input" value={profilePrefs.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'} onChange={(e) => setProfilePrefs({ ...profilePrefs, timeZone: e.target.value })}><option value="Africa/Johannesburg">South Africa (Johannesburg)</option><option value="UTC">UTC</option><option value="Europe/London">London</option><option value="America/New_York">New York</option></select>
          <label className="label">Date format</label>
          <select className="select input" value={profilePrefs.dateFormat || 'DD/MM/YYYY'} onChange={(e) => setProfilePrefs({ ...profilePrefs, dateFormat: e.target.value })}><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option></select>
          <label className="label">Time format</label>
          <select className="select input" value={profilePrefs.timeFormat || '24h'} onChange={(e) => setProfilePrefs({ ...profilePrefs, timeFormat: e.target.value })}><option value="24h">24-hour</option><option value="12h">12-hour</option></select>
          <label className="label">Currency display</label>
          <select className="select input" value={profilePrefs.currencyDisplay || 'symbol'} onChange={(e) => setProfilePrefs({ ...profilePrefs, currencyDisplay: e.target.value })}><option value="symbol">R (symbol)</option><option value="code">ZAR (code)</option></select>
          <label className="label">Number format</label>
          <select className="select input" value={profilePrefs.numberFormat || 'za'} onChange={(e) => setProfilePrefs({ ...profilePrefs, numberFormat: e.target.value })}><option value="za">1 234,56 (South African)</option><option value="en">1,234.56</option></select>
          <label className="label">Theme</label>
          <select className="select input" value={profilePrefs.theme || theme || 'light'} onChange={(e) => setProfilePrefs({ ...profilePrefs, theme: e.target.value })}><option value="light">Light</option><option value="dark">Dark</option></select>
          <label className="label">Interface density</label>
          <select className="select input" value={profilePrefs.density || 'comfortable'} onChange={(e) => setProfilePrefs({ ...profilePrefs, density: e.target.value })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select>
          <label className="label">Default landing page</label>
          <select className="select input" value={profilePrefs.landingPage || '/dashboard'} onChange={(e) => setProfilePrefs({ ...profilePrefs, landingPage: e.target.value })}><option value="/dashboard">Dashboard</option><option value="/clients">Clients</option><option value="/invoices">Invoices</option><option value="/tickets">Job cards</option><option value="/accounting">Accounting</option></select>
          <label className="label">Navigation layout</label>
          <select className="select input" value={profilePrefs.navLayout || 'bottom'} onChange={(e) => setProfilePrefs({ ...profilePrefs, navLayout: e.target.value })}><option value="bottom">Bottom navigation</option><option value="sidebar">Sidebar</option><option value="compact">Compact sidebar</option></select>
          <label className="label">Personal workspace label</label>
          <input className="input" value={profilePrefs.workspaceLabel || ''} onChange={(e) => setProfilePrefs({ ...profilePrefs, workspaceLabel: e.target.value })} placeholder="Optional personal label" />
          <label className="label">Quiet hours</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input className="input" type="time" aria-label="Quiet hours start" value={profilePrefs.quietStart || '20:00'} onChange={(e) => setProfilePrefs({ ...profilePrefs, quietStart: e.target.value })} /><input className="input" type="time" aria-label="Quiet hours end" value={profilePrefs.quietEnd || '07:00'} onChange={(e) => setProfilePrefs({ ...profilePrefs, quietEnd: e.target.value })} /></div>
          <label><input type="checkbox" checked={profilePrefs.emailNotifications !== false} onChange={(e) => setProfilePrefs({ ...profilePrefs, emailNotifications: e.target.checked })} /> Email notifications preference</label>
          <label><input type="checkbox" checked={!!profilePrefs.pushNotifications} onChange={(e) => setProfilePrefs({ ...profilePrefs, pushNotifications: e.target.checked })} /> Push notifications preference</label>
          <label><input type="checkbox" checked={!!profilePrefs.requireReauth} onChange={(e) => setProfilePrefs({ ...profilePrefs, requireReauth: e.target.checked })} /> Require re-authentication for sensitive actions (enforcement pending)</label>
          <label><input type="checkbox" checked={!!profilePrefs.reducedMotion} onChange={(e) => setProfilePrefs({ ...profilePrefs, reducedMotion: e.target.checked })} /> Reduce motion preference</label>
          <label><input type="checkbox" checked={!!profilePrefs.compactTables} onChange={(e) => setProfilePrefs({ ...profilePrefs, compactTables: e.target.checked })} /> Compact tables preference</label>
          <label><input type="checkbox" checked={!!profilePrefs.soundEffects} onChange={(e) => setProfilePrefs({ ...profilePrefs, soundEffects: e.target.checked })} /> Interface sounds preference</label>
          <label className="label">Auto-lock duration</label>
          <select className="select input" value={String(profilePrefs.autoLockMinutes || autoLockMinutes)} onChange={(e) => setProfilePrefs({ ...profilePrefs, autoLockMinutes: Number(e.target.value) })}><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select>
          <button type="button" className="btn btn-primary" onClick={() => {
            const identity = String(user?.id || user?.email || user?.username || 'local').trim().toLowerCase()
            const next = { ...profilePrefs, updatedAt: new Date().toISOString() }
            saveProfilePrefs(user, next)
            if (next.theme) setTheme(next.theme)
            localStorage.setItem('sa_density', next.density || 'comfortable')
            document.documentElement.dataset.density = next.density || 'comfortable'
            localStorage.setItem('sa_nav_prefs', JSON.stringify({ layout: next.navLayout || 'bottom' }))
            window.dispatchEvent(new CustomEvent('sa-nav-prefs', { detail: { layout: next.navLayout || 'bottom' } }))
            saveProfilePrefs(user, { autoLockMinutes: Number(next.autoLockMinutes || 5) })
            window.dispatchEvent(new Event('sa-auto-lock-updated'))
            setAutoLockMinutes(String(next.autoLockMinutes || 5))
            setProfileSaved(true)
            toast('Personal preferences saved for this account on this device', 'success')
          }}>Save personal profile</button>
          {profileSaved && <p className="muted" role="status">Saved for {user?.email || user?.username || 'this account'} on this device.</p>}
        </div>
      )}

      {tab === 'company' && (
        <form className="card" onSubmit={saveCompany} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Company & account profile</h3>
          <p className="muted" style={{ marginTop: 0 }}>Legal identity, contact, tax, banking and workspace details for your business type.</p>
          <CompanyProfileForm form={form} setForm={setForm} mode="full" showModuleSetup toast={toast} refresh={refresh} />
          <LoadingButton type="button" onClick={saveCompany} loading={busy} className="btn btn-primary" style={{ marginTop: 12 }}>{busy ? 'Saving…' : 'Save company profile'}</LoadingButton>
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
            enabled={!!vatDraft.enabled}
            rate={vatDraft.rate}
            onChange={({ enabled, rate }) => setVatDraft({ enabled, rate })}
          />
          <button type="button" className="btn btn-primary" onClick={saveVatPreferences} disabled={vatSaving}>
            {vatSaving ? 'Saving VAT settings…' : 'Save VAT settings'}
          </button>
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
            <span>Hide "Powered by SA Invoice Pro" on portal / PDFs (pilot)</span>
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
          <select className="select input" value={navPrefs.layout || 'bottom'} onChange={(e) => setNavPrefs({ ...navPrefs, layout: e.target.value })}>
            <option value="sidebar">Sidebar</option>
            <option value="bottom">Bottom navigation</option>
            <option value="compact">Compact sidebar</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={() => { applyNavPrefs(navPrefs); toast('Navigation preferences saved', 'success') }}>Save navigation settings</button>
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
              A server-verified workspace recovery PIN is required. There is no factory PIN or local-only reset bypass.
            </p>
            <label className="label">Workspace recovery PIN</label>
            <input className="input" type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="6–12 digit recovery PIN" />
            <label className="label">Confirm current account password</label>
            <input className="input" type="password" autoComplete="current-password" value={resetCurrentPassword} onChange={(e) => setResetCurrentPassword(e.target.value)} placeholder="Current account password" />
            <label className="label">Confirm recovery PIN</label>
            <input className="input" type="password" inputMode="numeric" maxLength={12} value={resetPinConfirm} onChange={(e) => setResetPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Re-enter recovery PIN" />
            <label className="label">Type RESET MY WORKSPACE</label>
            <input className="input" value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)} placeholder="RESET MY WORKSPACE" autoComplete="off" />
            <button type="button" className="btn btn-danger" style={{ marginTop: 10 }} disabled={busy || resetPhrase.trim() !== 'RESET MY WORKSPACE' || !/^\d{6,12}$/.test(resetPin) || resetPin !== resetPinConfirm || !resetCurrentPassword} onClick={clearWorkspaceSafely}>
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
          <h3 style={{ marginTop: 0 }}>Communication preferences</h3>
          <p className="muted">Choose when automated WhatsApp/SMS messages may be sent and maintain customer opt-outs.</p>
          <label className="label">Quiet hours start (0–23)</label>
          <input className="input" type="number" min="0" max="23" value={comms.quietStart} onChange={(e) => setComms({ ...comms, quietStart: Math.max(0, Math.min(23, Number(e.target.value))) })} />
          <label className="label">Quiet hours end (0–23)</label>
          <input className="input" type="number" min="0" max="23" value={comms.quietEnd} onChange={(e) => setComms({ ...comms, quietEnd: Math.max(0, Math.min(23, Number(e.target.value))) })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={comms.respectQuiet !== false} onChange={(e) => setComms({ ...comms, respectQuiet: e.target.checked })} />
            Respect quiet hours for automated messages
          </label>
          <label className="label">Add customer phone to the opt-out list</label>
          <input className="input" value={optPhone} onChange={(e) => setOptPhone(e.target.value)} placeholder="Phone number" />
          <button type="button" className="btn btn-outline" onClick={() => {
            const digits = String(optPhone || '').replace(/\D/g, '')
            if (!digits) return toast('Enter a valid phone number', 'error')
            setComms({ ...comms, optOutPhones: [...new Set([...(comms.optOutPhones || []), digits])] })
            setOptPhone('')
          }}>Add opt-out number</button>
          {(comms.optOutPhones || []).map((phone) => <div key={phone} className="row" style={{ justifyContent: 'space-between' }}><span>{phone}</span><button type="button" className="btn btn-outline btn-sm" onClick={() => setComms({ ...comms, optOutPhones: comms.optOutPhones.filter((p) => p !== phone) })}>Remove</button></div>)}
          <button type="button" className="btn btn-primary" onClick={() => { const next = saveCommsPrefs(comms); setComms(next); toast('Communication preferences saved', 'success') }}>Save communication settings</button>
        </div>
      )}

      {tab === 'operations' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Owner defaults</h3>
          <label className="label">Invoice prefix</label>
          <input className="input" value={ownerDefaults.invoicePrefix} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, invoicePrefix: e.target.value })} />
          <label className="label">Default invoice document type</label>
          <select className="select input" value={ownerDefaults.invoiceDocumentType || 'tax-invoice'} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, invoiceDocumentType: e.target.value })}><option value="tax-invoice">Tax invoice</option><option value="invoice">Standard invoice</option><option value="proforma">Pro-forma invoice</option><option value="deposit">Deposit invoice</option><option value="credit-note">Credit note</option><option value="statement">Customer statement</option></select>
          <label className="label">Default job card type</label>
          <select className="select input" value={ownerDefaults.jobCardType || 'it-repair'} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, jobCardType: e.target.value })}><option value="it-repair">IT repair / diagnostics</option><option value="onsite-service">On-site service call</option><option value="maintenance">Maintenance / service</option><option value="installation">Installation / setup</option><option value="collection-delivery">Collection & delivery</option><option value="general-workshop">General workshop job</option></select>
          <label className="label">Quote validity</label>
          <select className="select input" value={String(ownerDefaults.quoteValidityDays || 14)} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, quoteValidityDays: Number(e.target.value) })}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option></select>
          <label className="label">Payment terms</label>
          <select className="select input" value={String(ownerDefaults.paymentTermsDays || 7)} onChange={(e) => setOwnerDefaults({ ...ownerDefaults, paymentTermsDays: Number(e.target.value) })}><option value="0">Due immediately</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
          <button type="button" className="btn btn-primary" onClick={() => { localStorage.setItem('sa_owner_defaults', JSON.stringify(ownerDefaults)); toast('Operational defaults saved', 'success') }}>Save operational defaults</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="card form-grid" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Privacy & automatic workspace lock</h3>
          <p className="muted" style={{ marginTop: 0 }}>Automatically lock the workspace after inactivity. Your subscription and device activation stay intact; signing back in unlocks the workspace.</p>
          <label className="label" htmlFor="auto-lock-minutes">Lock after</label>
          <select id="auto-lock-minutes" className="select input" value={autoLockMinutes} onChange={(e) => { const next = [5, 15, 30].includes(Number(e.target.value)) ? e.target.value : '5'; setAutoLockMinutes(next) }}><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select>
          <p className="muted" style={{ fontSize: 12 }}>Activity resets the timer. When it expires, the local workspace locks and requires sign-in again without revoking the cloud session or licence.</p>
          <button type="button" className="btn btn-primary" onClick={() => { saveProfilePrefs(user, { autoLockMinutes: Number(autoLockMinutes) }); window.dispatchEvent(new Event('sa-auto-lock-updated')); toast('Security preferences saved', 'success') }}>Save security settings</button>
          <DeviceAccessPanel toast={toast} userLabel={user?.email} />
        </div>
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      </div>
    </PageFade>
  )
}
