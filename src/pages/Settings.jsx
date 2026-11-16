import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { APP_VERSION, SA_CONFIG } from '../config'
import { downloadBackupStreaming } from '../lib/db'
import { importBackupFromFile } from '../lib/backupImport'
import { PageFade, ConfirmDialog, LoadingButton } from '../components/ui'
import CloudSettings from '../components/CloudSettings'
import DeviceAccessPanel from '../components/DeviceAccessPanel'
import {
  listAutoBackups, restoreAutoBackup, downloadAutoBackup, saveAutoBackup,
} from '../lib/localAutoBackup'
import { readAccessStatus, normalizedPlan } from '../lib/accessControl'
import { readProfilePrefs, saveProfilePrefs } from '../lib/profilePreferences'
import CompanyProfileForm from '../components/CompanyProfileForm'
import ThemePicker from '../components/ThemePicker'
import { companyToForm, formToCompanyPayload, validateCompanyForm } from '../lib/companyProfile'

export default function Settings() {
  const { user, company, setCompany, toast, refresh, vatEnabled, vatRate, setVatEnabled, setVatRate, theme, setTheme } = useApp()
  const nav = useNavigate()
  const [tab, setTab] = useState('company')
  const [busy, setBusy] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [autoBackups, setAutoBackups] = useState([])
  const [form, setForm] = useState(() => companyToForm(company))
  const [accessStatus, setAccessStatus] = useState(null)
  const [vatDraft, setVatDraft] = useState(() => ({ enabled: !!vatEnabled, rate: Number(vatRate ?? 0.15) * 100 }))
  const [vatSaving, setVatSaving] = useState(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => {
    const n = Number(readProfilePrefs(user).autoLockMinutes || 5)
    return [5, 15, 30].includes(n) ? String(n) : '5'
  })
  const plan = normalizedPlan(accessStatus)

  useEffect(() => { setVatDraft({ enabled: !!vatEnabled, rate: Number(vatRate ?? 0.15) * 100 }) }, [vatEnabled, vatRate])
  useEffect(() => { setForm(companyToForm(company)) }, [company])
  useEffect(() => { readAccessStatus().then(setAccessStatus).catch(() => {}) }, [])
  useEffect(() => { refreshAutoBackups() }, [])

  const refreshAutoBackups = async () => {
    try { setAutoBackups(await listAutoBackups()) } catch { setAutoBackups([]) }
  }

  const importDeviceBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = file.size / (1024 * 1024)
    const confirmed = window.confirm(
      `Restore this company backup and replace the current local workspace?\n\nFile size: ${sizeMb.toFixed(1)} MB\nA recovery snapshot will be saved first. Keep this page open until the restore finishes.`
    )
    if (!confirmed) { e.target.value = ''; return }
    setBusy(true)
    setImportProgress({ phase: 'backup', percent: 1, message: 'Saving a recovery copy before import…', rows: 0 })
    try {
      try { await saveAutoBackup({ reason: 'pre-import' }) } catch (err) { console.warn('[backup] pre-import snapshot', err) }
      setImportProgress({ phase: 'reading', percent: 3, message: 'Streaming backup file…', rows: 0 })
      const stats = await importBackupFromFile(file, {
        allowPartial: true,
        estimatedBytes: file.size,
        onProgress: setImportProgress,
      })
      await refresh()
      await refreshAutoBackups()
      toast(`Backup restored (${stats.rows || 0} records)`, 'success')
    } catch (err) {
      console.error(err)
      toast(err?.message || 'Restore failed — your previous workspace was not replaced', 'error')
    } finally {
      setBusy(false)
      setImportProgress(null)
      e.target.value = ''
    }
  }

  const clearWorkspaceSafely = () => {
    setConfirm({
      title: 'Clear local workspace?',
      message: 'Invoices, clients and products on this device will be removed. A recovery snapshot is saved first. Account and licence data stay on the device.',
      confirmLabel: 'Clear workspace',
      onConfirm: async () => {
        setConfirm(null)
        setBusy(true)
        try {
          try { await saveAutoBackup({ reason: 'pre-clear' }) } catch {}
          await db.clearActiveWorkspace()
          await refresh()
          toast('Workspace cleared', 'success')
        } catch (err) {
          toast(err?.message || 'Could not clear workspace', 'error')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const saveVatPreferences = async () => {
    setVatSaving(true)
    try {
      const enabled = !!vatDraft.enabled
      const rate = Math.max(0, Math.min(100, Number(vatDraft.rate) || 0)) / 100
      await db.setSetting('vatEnabled', enabled)
      await db.setSetting('vatRate', rate)
      setVatEnabled(enabled)
      setVatRate(rate)
      toast(enabled ? `VAT on at ${(rate * 100).toFixed(0)}%` : 'VAT turned off for new documents', 'success')
    } catch (err) {
      toast(err?.message || 'Could not save VAT preferences', 'error')
    } finally {
      setVatSaving(false)
    }
  }

  const saveCompany = async () => {
    const err = validateCompanyForm(form)
    if (err) { toast(err, 'error'); return }
    setBusy(true)
    try {
      const payload = formToCompanyPayload(form)
      const saved = await db.saveCompany(payload)
      setCompany(saved)
      toast('Company saved', 'success')
    } catch (e) {
      toast(e?.message || 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'data', label: 'Backup' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'look', label: 'Look' },
    { id: 'security', label: 'Security' },
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

        <div role="tablist" aria-label="Settings sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" data-testid={`settings-tab-${item.id}`}
              aria-selected={tab === item.id} className={tab === item.id ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => setTab(item.id)}>{item.label}</button>
          ))}
        </div>

        {tab === 'company' && (
          <>
          <div className="card form-grid" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Company profile</h3>
            <CompanyProfileForm form={form} setForm={setForm} />
            <LoadingButton className="btn btn-primary" busy={busy} onClick={saveCompany}>Save company profile</LoadingButton>
          </div>
          <div className="card form-grid" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>VAT (South Africa)</h3>
            <p className="muted" style={{ marginTop: 0 }}>Controls tax invoices, PDF totals, and default document type. Existing invoices keep the VAT state they were saved with.</p>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={!!vatDraft.enabled} onChange={(e) => setVatDraft((d) => ({ ...d, enabled: e.target.checked }))} />
              Charge VAT on new invoices & quotes
            </label>
            <label className="label" htmlFor="vat-rate">VAT rate (%)</label>
            <input id="vat-rate" className="input" type="number" min={0} max={100} step={0.5} disabled={!vatDraft.enabled}
              value={vatDraft.rate}
              onChange={(e) => setVatDraft((d) => ({ ...d, rate: e.target.value }))} />
            <LoadingButton className="btn btn-primary" busy={vatSaving} onClick={saveVatPreferences}>Save VAT preferences</LoadingButton>
          </div>
          </>
        )}

        {tab === 'data' && (
          <div className="card form-grid" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Data & backup</h3>
            <p className="muted">Download a full JSON backup, or restore from a previous export. Large files use streaming import so low-memory Android devices do not crash.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <LoadingButton className="btn btn-primary" busy={busy} onClick={async () => {
                setBusy(true)
                try {
                  const result = await downloadBackupStreaming({})
                  toast(`Backup downloaded (${result.rows || 0} records)`, 'success')
                } catch (err) {
                  if (err?.name !== 'AbortError') toast(err?.message || 'Download failed', 'error')
                } finally { setBusy(false) }
              }}>Download backup JSON</LoadingButton>
              <label className="btn btn-outline" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                Restore backup…
                <input type="file" accept="application/json,.json" hidden disabled={busy} onChange={importDeviceBackup} data-testid="settings-import-backup" />
              </label>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={clearWorkspaceSafely}>Clear workspace</button>
            </div>
            {importProgress && (
              <div className="card" style={{ marginTop: 12, padding: 12 }} data-testid="import-progress">
                <strong>{importProgress.message || importProgress.phase}</strong>
                <div style={{ marginTop: 6, height: 8, background: 'var(--border,#334155)', borderRadius: 4 }}>
                  <div style={{ width: `${Math.min(100, Number(importProgress.percent) || 0)}%`, height: '100%', background: 'var(--accent,#0d9488)', borderRadius: 4 }} />
                </div>
                <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{importProgress.rows || 0} rows</p>
              </div>
            )}
            <h4>Recovery snapshots</h4>
            {autoBackups.length === 0 && <p className="muted">No local recovery snapshots yet.</p>}
            {autoBackups.map((b) => (
              <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>{b.at || b.id} {b.reason ? `· ${b.reason}` : ''}</span>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={async () => {
                  setBusy(true)
                  try {
                    await restoreAutoBackup(b.id, { confirmed: true })
                    await refresh()
                    toast('Recovery snapshot restored', 'success')
                  } catch (err) {
                    toast(err?.message || 'Restore failed', 'error')
                  } finally { setBusy(false) }
                }}>Restore</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadAutoBackup(b.id)}>Download</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'cloud' && (
          <div style={{ marginTop: 12 }}><CloudSettings /></div>
        )}

        {tab === 'look' && (
          <div className="card form-grid" style={{ marginTop: 12 }}>
            <ThemePicker setTheme={setTheme} toast={toast} />
          </div>
        )}

        {tab === 'security' && (
          <div className="card form-grid" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Privacy & automatic workspace lock</h3>
            <p className="muted" style={{ marginTop: 0 }}>Automatically lock the workspace after inactivity. Your subscription and device activation stay intact; signing back in unlocks the workspace.</p>
            <label className="label" htmlFor="auto-lock-minutes">Lock after</label>
            <select id="auto-lock-minutes" data-testid="auto-lock-minutes" className="select input" value={autoLockMinutes} onChange={(e) => { const next = [5, 15, 30].includes(Number(e.target.value)) ? e.target.value : '5'; setAutoLockMinutes(next) }}>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
            <p className="muted" style={{ fontSize: 12 }}>Activity resets the timer. When it expires, the local workspace locks and requires sign-in again without revoking the cloud session or licence.</p>
            <button type="button" className="btn btn-primary" onClick={() => { saveProfilePrefs(user, { autoLockMinutes: Number(autoLockMinutes) }); window.dispatchEvent(new Event('sa-auto-lock-updated')); toast('Security preferences saved', 'success') }}>Save security settings</button>
            <h3>Device access</h3>
            <DeviceAccessPanel toast={toast} userLabel={user?.email} />
          </div>
        )}

        {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      </div>
    </PageFade>
  )
}
