import React, { useState, useEffect } from 'react'
import { moduleSetupForType, installModulePack } from '../lib/moduleSetup'
import { getBusinessType } from '../lib/businessTypes'

export default function ModuleSetupStep({ businessTypeId, toast, refresh, onDefaults }) {
  const type = getBusinessType(businessTypeId)
  const setup = moduleSetupForType(businessTypeId)
  const [busy, setBusy] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [checked, setChecked] = useState({})

  useEffect(() => {
    if (setup?.defaults && onDefaults) onDefaults(setup.defaults)
  }, [businessTypeId])

  if (!setup) {
    return (
      <div className="form-section">
        <h4 style={{ marginTop: 0 }}>General SME desk</h4>
        <p className="muted">
          No dedicated module pack for <strong>{type.label}</strong>. Core invoicing, quotes and clients are ready after you save.
          You can still install packs later under Products.
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

  return (
    <div className="form-section module-setup-step">
      <h4 style={{ marginTop: 0 }}>{setup.title}</h4>
      <p className="muted" style={{ marginTop: 0 }}>{setup.intro}</p>

      <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
        <strong>Catalog pack</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>
          Pre-loads services and products with SA-style ZAR prices you can edit anytime.
        </p>
        <button type="button" className="btn btn-secondary" disabled={busy || installed} onClick={runPack}>
          {busy ? 'Installing…' : installed ? 'Pack installed ✓' : `Install ${type.short} pack`}
        </button>
      </div>

      <strong style={{ display: 'block', marginBottom: 8 }}>Setup checklist</strong>
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

      <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>After setup, start here:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {setup.routes.map((r) => (
          <span key={r.to} className="btn btn-outline btn-sm" style={{ pointerEvents: 'none', opacity: 0.85 }}>
            {r.label}
          </span>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Links open on the desk after you save.
      </p>
    </div>
  )
}
