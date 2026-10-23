import React, { useEffect, useState, useRef } from 'react'

/** Dropdown action menu (⋯) for table rows */
export function ActionMenu({ label = 'Actions', items = [], align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = (items || []).filter((it) => it && !it.hidden)
  if (!visible.length) return null

  return (
    <div className={`action-menu ${align === 'left' ? 'align-left' : ''}`} ref={ref}>
      <button
        type="button"
        className="btn btn-outline btn-sm action-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="action-menu-panel" role="menu">
          {visible.map((it) => (
            <button
              key={it.id || it.label}
              type="button"
              role="menuitem"
              className={`action-menu-item ${it.danger ? 'danger' : ''} ${it.primary ? 'primary' : ''}`}
              disabled={it.disabled}
              onClick={() => {
                setOpen(false)
                it.onClick?.()
              }}
            >
              {it.icon ? <span className="action-menu-icon">{it.icon}</span> : null}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Inline editable cell — click to edit, blur/Enter to save */
export function EditableCell({
  value,
  onSave,
  type = 'text',
  placeholder = '—',
  formatDisplay,
  className = '',
  disabled,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      setDraft(value ?? '')
      setTimeout(() => inputRef.current?.focus?.(), 20)
    }
  }, [editing, value])

  const commit = async () => {
    setEditing(false)
    const next = type === 'number' ? (draft === '' ? '' : Number(draft)) : draft
    if (String(next) === String(value ?? '')) return
    try {
      await onSave?.(next)
    } catch (e) {
      console.warn('EditableCell save failed', e)
    }
  }

  if (disabled) {
    return (
      <span className={`editable-cell disabled ${className}`}>
        {formatDisplay ? formatDisplay(value) : (value ?? placeholder)}
      </span>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`editable-cell ${className}`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {formatDisplay ? formatDisplay(value) : (value != null && value !== '' ? String(value) : placeholder)}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      className={`input editable-cell-input ${className}`}
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      value={draft}
      step={type === 'number' ? '0.01' : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setEditing(false)
        }
      }}
    />
  )
}

/** Compact status / enum dropdown for tables */
export function SelectCell({ value, options = [], onChange, disabled }) {
  return (
    <select
      className="select select-cell"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="Select"
    >
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id
        const label = typeof o === 'string' ? o : o.label
        return (
          <option key={id} value={id}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

/** Sticky-header data table wrapper */
export function DataTable({ children, sticky = true, className = '' }) {
  return (
    <div className={`data-table-wrap ${sticky ? 'sticky-head' : ''} ${className}`}>
      <table className="table data-table">{children}</table>
    </div>
  )
}
