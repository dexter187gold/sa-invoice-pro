import React, { useState, useEffect } from 'react'
import { moduleSetupForType, installModulePack } from '../lib/moduleSetup'
import { getBusinessType } from '../lib/businessTypes'
import { moduleFieldsForType } from '../lib/companyProfile'

/** Module-specific setup for Preferences (and Settings). */
export default function ModuleSetupStep({
  businessTypeId,
  toast,
  refresh,
  onDefaults,
  form,
  setForm,
  showFields = true,
}) {
  const type = getBusinessType(businessTypeId)
  const setup = moduleSetupForType(businessTypeId)
  const moduleFields = moduleFieldsForType(businessTypeId)
  const [busy, setBusy] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [checked, setChecked] = useState({})

  useEffect(() => {
    if (setup?.defaults && onDefaults) onDefaults(setup.defaults)
  }, [businessTypeId])

  const set = (key) => (e) => {
    if (!setForm) return
    setForm({ ...form, [key]: e.target.value })
  }

  if (!setup) {
    return (
      <div className="form-section module-setup-step">
        <h4 style={{ marginTop: 0 }}>Module setup · {type.short}</h4>
        <p className="muted">
          No dedicated pack for <strong>{type.label}</strong>. Core invoicing, quotes and clients are ready after you finish.
          You can install vertical packs later under Products.
        </p>
      </div>
    )
  }

  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }))

  const runPack = async () => {
    setBusy(true)
    try {
      const res = await installModulePack(businessTypeId)
      if (res.ok) {
        setInstalled(true)
        await refresh?.()
        toast?.(`Installed ${res.label} · ${res.n} items`, 'success')
      } else {
        toast?.(res.message || 'Install skipped', 'info')
      }
    } catch (e) {
      toast?.(e?.message || 'Install failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doneCount = setup.checklist.filter((_, i) => checked[i]).length + (installed ? 1 : 0)
  const totalHints = setup.checklist.length + 1

  return (
    <div className="form-section module-setup-step">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ margin: '0 0 4px' }}>Module setup · {type.short}</h4>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{setup.intro}</p>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>
          {doneCount}/{totalHints} ready
        </span>
      </div>

      {showFields && moduleFields.length > 0 && form && setForm && (
        <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid var(--border)' }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>{type.short} details</strong>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
            Optional — saved with your company profile (hours, SLA, service area, etc.).
          </p>
          <div className="form-grid cols-2">
            {moduleFields.map((f) => (
              <div
                key={f.key}
                style={
                  f.key.includes('Note') || f.key.includes('Policy') || f.key === 'specialties'
                    ? { gridColumn: '1 / -1' }
                    : undefined
                }
              >
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  value={form[f.key] || ''}
                  onChange={set(f.key)}
                  placeholder={f.placeholder || ''}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginTop: 12, border: '1px solid var(--border)' }}>
        <strong>1. Install catalog pack</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>
          Pre-loads services and products with indicative ZAR prices — edit anytime under Products.
        </p>
        <button type="button" className="btn btn-secondary" disabled={busy || installed} onClick={runPack}>
          {busy ? 'Installing…' : installed ? 'Pack installed ✓' : `Install ${type.short} pack`}
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <strong style={{ display: 'block', marginBottom: 8 }}>2. Setup checklist</strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
          {setup.checklist.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => toggle(i)}
                id={`mod-check-${i}`}
                style={{ marginTop: 3 }}
              />
              <label htmlFor={`mod-check-${i}`} style={{ fontSize: 14, cursor: 'pointer' }}>{item}</label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <strong style={{ display: 'block', marginBottom: 6 }}>3. After setup, start here</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {setup.routes.map((r) => (
            <span key={r.to} className="btn btn-outline btn-sm" style={{ pointerEvents: 'none', opacity: 0.9 }}>
              {r.label}
            </span>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          These open on the desk after you complete setup.
        </p>
      </div>
    </div>
  )
}
