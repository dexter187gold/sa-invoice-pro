import React, { useState } from 'react'
import { THEMES, applyTheme } from '../lib/themes'
import FontPicker from './FontPicker'

export default function ThemePicker({ setTheme, toast }) {
  const [themeId, setThemeId] = useState(() => {
    try { return localStorage.getItem('sa_global_theme') || 'midnight' } catch { return 'midnight' }
  })
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Global themes</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Ten modern product themes used by leading apps in 2026.</p>
      <div className="theme-grid" style={{ marginBottom: 16 }}>
        {THEMES.map((th) => (
          <button
            key={th.id}
            type="button"
            className={`theme-swatch ${themeId === th.id ? 'on' : ''}`}
            onClick={() => {
              applyTheme(th.id)
              setThemeId(th.id)
              setTheme?.(th.id === 'light' || th.id === 'sand' ? 'light' : 'dark')
              toast?.('Theme: ' + th.label, 'success')
            }}
            style={{ ['--t1']: th.vars['--bg'], ['--t2']: th.vars['--green'] }}
          >
            <div className="swatch-bar" />
            <div className="name">{th.label}</div>
            <div className="desc">{th.desc}</div>
          </button>
        ))}
      </div>
      <FontPicker toast={toast} />
    </div>
  )
}
