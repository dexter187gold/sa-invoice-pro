import React, { useState } from 'react'
import { FONTS, applyFont, getSavedFontId } from '../lib/fonts'

export default function FontPicker({ toast }) {
  const [fontId, setFontId] = useState(() => getSavedFontId())

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>App font</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Changes the typeface across the whole desk — menus, tables, forms and invoices on screen.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`theme-swatch ${fontId === f.id ? 'on' : ''}`}
            onClick={() => {
              applyFont(f.id)
              setFontId(f.id)
              toast?.('Font: ' + f.label, 'success')
            }}
            style={{ textAlign: 'left', fontFamily: f.stack }}
          >
            <div className="name" style={{ fontFamily: f.stack, fontSize: 16 }}>
              {f.label}
            </div>
            <div className="desc" style={{ fontSize: 11 }}>
              {f.desc}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85, fontFamily: f.stack }}>
              Invoice R1 234.56
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
