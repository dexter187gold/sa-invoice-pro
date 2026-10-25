import React from 'react'
import { PHASES, phaseProgress } from '../lib/phases'

export default function PhaseBoard({ compact = false }) {
  const prog = phaseProgress()
  return (
    <div className="card phase-board" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong>Execution phases</strong>
        <span className="muted" style={{ fontSize: 12 }}>{prog.done}/{prog.total} · {prog.pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--border,#333)', margin: '8px 0 12px' }}>
        <div style={{ width: `${prog.pct}%`, height: 6, borderRadius: 99, background: 'var(--green,#22c55e)' }} />
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill,minmax(200px,1fr))' }}>
        {PHASES.map((ph) => (
          <div key={ph.id} style={{ border: '1px solid var(--border,rgba(255,255,255,.1))', borderRadius: 12, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <strong style={{ fontSize: 13 }}>{ph.id} · {ph.title}</strong>
              <span className="muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>{ph.status}</span>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12 }}>
              {ph.items.map((it) => (
                <li key={it.id} style={{ opacity: it.done ? 0.85 : 0.5 }}>
                  {it.done ? '✓' : '○'} {it.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
