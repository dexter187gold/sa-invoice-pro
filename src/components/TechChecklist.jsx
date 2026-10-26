import React from 'react'
import { CHECKLISTS, emptyChecklistState } from '../lib/techChecklist'

export default function TechChecklist({ type = 'intake', value, onChange }) {
  const def = CHECKLISTS[type]
  if (!def) return null
  const state = value && typeof value === 'object' ? value : emptyChecklistState(type)
  const done = Object.values(state).filter(Boolean).length

  return (
    <div className="card" style={{ padding: 12, marginTop: 8 }}>
      <strong>{def.label}</strong>
      <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{done}/{def.items.length}</span>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
        {def.items.map((label, i) => (
          <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={!!state[i]}
                onChange={() => {
                  const next = { ...state, [i]: !state[i] }
                  onChange?.(next)
                }}
              />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChecklistPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label className="label">Tech checklist type</label>
      <select className="input" value={value || 'intake'} onChange={(e) => onChange?.(e.target.value)}>
        {Object.values(CHECKLISTS).map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    </div>
  )
}
