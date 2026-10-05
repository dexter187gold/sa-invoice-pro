
import React from 'react'

/** Status badge with consistent colour mapping */
export function StatusBadge({ status, map }) {
  const s = String(status || 'unknown').toLowerCase()
  const defaults = {
    paid: '',
    converted: '',
    resolved: '',
    closed: '',
    unpaid: 'warn',
    partial: 'warn',
    draft: 'warn',
    open: 'warn',
    overdue: 'bad',
    cancelled: 'bad',
    canceled: 'bad',
  }
  const cls = (map && map[s]) || defaults[s] || 'warn'
  return <span className={`badge ${cls}`}>{status || '—'}</span>
}

/** Search input with clear button */
export function SearchInput({ value, onChange, placeholder = 'Search…', id }) {
  return (
    <div className="search-wrap">
      <input
        id={id}
        className="input search-input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {value ? (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onChange('')}>
          ×
        </button>
      ) : null}
    </div>
  )
}

/** Empty state with optional action */
export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="card empty empty-rich">
      <div className="empty-title">{title}</div>
      {hint ? <p className="muted">{hint}</p> : null}
      {action || null}
    </div>
  )
}

/** Filter chip row */
export function FilterChips({ options, value, onChange }) {
  return (
    <div className="filter-chips" role="group" aria-label="Filters">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`chip ${value === o.id ? 'chip-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.count != null ? <span className="chip-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>
}

export function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`card stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="stat-hint muted">{hint}</div> : null}
    </div>
  )
}

export function formatDateZA(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

export function matchesQuery(obj, query, fields) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return fields.some((f) => {
    const v = obj[f]
    if (v == null) return false
    return String(v).toLowerCase().includes(q)
  })
}
