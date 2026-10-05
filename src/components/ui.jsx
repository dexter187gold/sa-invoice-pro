
import React, { useEffect, useState, useCallback } from 'react'

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
export function SearchInput({ value, onChange, placeholder = 'Search…', id, autoFocus }) {
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
        autoFocus={autoFocus}
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
export function EmptyState({ title = 'Nothing here yet', hint, action, icon }) {
  return (
    <div className="card empty empty-rich">
      {icon ? <div className="empty-icon" aria-hidden>{icon}</div> : null}
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

export function relativeTime(iso) {
  if (!iso) return ''
  try {
    const t = new Date(iso).getTime()
    const d = Date.now() - t
    const sec = Math.round(d / 1000)
    if (sec < 60) return 'just now'
    const min = Math.round(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.round(min / 60)
    if (hr < 48) return `${hr}h ago`
    const days = Math.round(hr / 24)
    if (days < 30) return `${days}d ago`
    return formatDateZA(iso)
  } catch {
    return ''
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

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(text || ''))
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={copy} title={label}>
      {done ? 'Copied' : label}
    </button>
  )
}

export function Skeleton({ rows = 3, height = 14 }) {
  return (
    <div className="skeleton-stack" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ height, width: `${88 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function SortableTh({ id, label, sort, onSort, align }) {
  const active = sort?.key === id
  const dir = active ? sort.dir : null
  return (
    <th
      className={`sortable-th ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onSort?.(id)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      title="Sort"
    >
      {label}
      <span className="sort-ind">{dir === 'asc' ? ' ▲' : dir === 'desc' ? ' ▼' : ' ⇅'}</span>
    </th>
  )
}

export function useSort(defaultKey = 'date', defaultDir = 'desc') {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir })
  const onSort = useCallback((key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }, [])
  const apply = useCallback(
    (rows, getters) => {
      const list = [...rows]
      const get = getters[sort.key] || ((r) => r[sort.key])
      list.sort((a, b) => {
        const va = get(a)
        const vb = get(b)
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        if (typeof va === 'number' && typeof vb === 'number') {
          return sort.dir === 'asc' ? va - vb : vb - va
        }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
        return sort.dir === 'asc' ? cmp : -cmp
      })
      return list
    },
    [sort]
  )
  return { sort, onSort, apply }
}

/** Confirm modal */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-title" style={{ marginTop: 0 }}>{title}</h3>
        <p className="muted" style={{ marginTop: 0 }}>{message}</p>
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Segmented control */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`seg-btn ${value === o.id ? 'seg-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Loading-aware primary button */
export function LoadingButton({ loading, children, className = 'btn btn-primary', disabled, ...rest }) {
  return (
    <button type="button" className={className} disabled={disabled || loading} {...rest}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

/** Progress bar 0–100 */
export function ProgressBar({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, max ? (Number(value) / max) * 100 : 0))
  return (
    <div className={`progress-bar ${tone ? `progress-${tone}` : ''}`} title={`${Math.round(pct)}%`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Page fade wrapper */
export function PageFade({ children }) {
  return <div className="page-fade">{children}</div>
}
