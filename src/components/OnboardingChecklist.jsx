import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { STEPS, loadOnboarding, toggleStep, progress } from '../lib/onboarding'

export default function OnboardingChecklist() {
  const [state, setState] = useState(() => loadOnboarding())
  const p = progress()
  if (p.pct >= 100) return null

  return (
    <div className="card onboarding-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong>Shop setup · {p.done}/{p.total}</strong>
        <span className="muted" style={{ fontSize: 12 }}>{p.pct}%</span>
      </div>
      <div className="onboarding-bar" style={{ margin: '8px 0 12px' }}>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--border, #333)' }}>
          <div style={{ width: `${p.pct}%`, height: 6, borderRadius: 99, background: 'var(--green, #22c55e)' }} />
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEPS.map((step) => (
          <li key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={!!state[step.id]}
              onChange={() => setState(toggleStep(step.id))}
            />
            <Link to={step.path} style={{ color: 'inherit', textDecoration: state[step.id] ? 'line-through' : 'none', opacity: state[step.id] ? 0.55 : 1 }}>
              {step.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
