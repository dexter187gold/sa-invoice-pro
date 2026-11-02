import React from 'react'

export const VAT_PRESETS = [
  { id: 'off', label: 'No VAT (not registered)', enabled: false, rate: 0 },
  { id: 'standard', label: 'Standard rate 15%', enabled: true, rate: 15 },
  { id: 'zero', label: 'Zero-rated 0%', enabled: true, rate: 0 },
  { id: 'custom', label: 'Custom rate\u2026', enabled: true, rate: null },
]

export function resolveVatPreset(enabled, rate) {
  if (!enabled) return 'off'
  const r = Number(rate)
  if (r === 15) return 'standard'
  if (r === 0) return 'zero'
  return 'custom'
}

export default function VatSelector({ enabled, rate, onChange, compact = false }) {
  const preset = resolveVatPreset(enabled, rate)
  const [custom, setCustom] = React.useState(
    preset === 'custom' ? String(rate ?? '') : '',
  )

  const applyPreset = (id) => {
    const p = VAT_PRESETS.find((x) => x.id === id)
    if (!p) return
    if (id === 'custom') {
      const n = Number(custom)
      onChange?.({ enabled: true, rate: Number.isFinite(n) ? n : 15 })
      return
    }
    onChange?.({ enabled: p.enabled, rate: p.rate })
  }

  const onCustomRate = (e) => {
    const v = e.target.value
    setCustom(v)
    const n = Number(v)
    onChange?.({ enabled: true, rate: Number.isFinite(n) ? n : 0 })
  }

  return (
    <div className="vat-selector">
      <label className="label">VAT on invoices</label>
      <select
        className="select"
        value={preset}
        onChange={(e) => applyPreset(e.target.value)}
        aria-label="VAT mode"
      >
        {VAT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      {preset === 'custom' && (
        <div style={{ marginTop: 8 }}>
          <label className="label">Custom rate %</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={custom}
            onChange={onCustomRate}
            placeholder="e.g. 15"
          />
        </div>
      )}
      {!compact && (
        <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
          {preset === 'off' && 'Invoices show amounts without VAT lines.'}
          {preset === 'standard' && 'South Africa standard VAT rate (15%).'}
          {preset === 'zero' && 'VAT registered but lines at 0% (zero-rated supplies).'}
          {preset === 'custom' && 'Most SA SMEs use 15% \u2014 use custom only if required.'}
        </p>
      )}
    </div>
  )
}
