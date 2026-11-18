import React, { useState } from 'react'
import { LAYOUT_MODES, readUiLayout, saveUiLayout } from '../lib/uiLayout'

export default function LayoutSettingsCard({ toast }) {
  const [uiLayout, setUiLayout] = useState(() => readUiLayout())
  return (
    <div className="form-grid" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>App layout</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Modern desk (orb / bottom nav) or traditional invoice side-nav layout.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LAYOUT_MODES.map((m) => (
          <label key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="radio"
              name="ui-layout"
              checked={uiLayout === m.id}
              onChange={() => {
                const next = saveUiLayout(m.id)
                setUiLayout(next)
                toast?.(m.id === 'traditional' ? 'Traditional layout on' : 'Modern layout on', 'success')
              }}
            />
            <span>
              <strong>{m.label}</strong>
              <span className="muted" style={{ display: 'block', fontSize: 12 }}>{m.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
