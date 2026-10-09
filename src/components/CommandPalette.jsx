import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { matchesQuery } from './ui'

const STATIC_ACTIONS = [
  { id: 'nav-home', label: 'Go to Home', path: '/', group: 'Navigate' },
  { id: 'nav-dash', label: 'Go to Dashboard', path: '/dashboard', group: 'Navigate' },
  { id: 'nav-inv', label: 'Go to Invoices', path: '/invoices', group: 'Navigate' },
  { id: 'nav-new-inv', label: 'New invoice', path: '/invoices/new', group: 'Actions' },
  { id: 'nav-quotes', label: 'Go to Quotes', path: '/quotes', group: 'Navigate' },
  { id: 'nav-clients', label: 'Go to Clients', path: '/clients', group: 'Navigate' },
  { id: 'nav-products', label: 'Go to Products', path: '/products', group: 'Navigate' },
  { id: 'nav-tickets', label: 'Go to Job cards', path: '/tickets', group: 'Navigate' },
  { id: 'nav-new-job', label: 'New job card', path: '/tickets', group: 'Actions' },
  { id: 'nav-expenses', label: 'Go to Expenses', path: '/expenses', group: 'Navigate' },
  { id: 'nav-payments', label: 'Go to Payments', path: '/payments', group: 'Navigate' },
  { id: 'nav-employees', label: 'Go to Employees', path: '/employees', group: 'Navigate' },
  { id: 'nav-payroll', label: 'Go to Payroll', path: '/payroll', group: 'Navigate' },
  { id: 'nav-accounting', label: 'Go to Accounting', path: '/accounting', group: 'Navigate' },
  { id: 'nav-reports', label: 'Go to Reports', path: '/reports', group: 'Navigate' },
  { id: 'nav-docs', label: 'Go to Documents', path: '/documents', group: 'Navigate' },
  { id: 'nav-settings', label: 'Go to Settings', path: '/settings', group: 'Navigate' },
  { id: 'nav-license', label: 'Go to License', path: '/license', group: 'Navigate' },
]

export default function CommandPalette({ open, onClose }) {
  const nav = useNavigate()
  const { invoices, clients, quotes, theme, setTheme } = useApp()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const items = useMemo(() => {
    const dynamic = []
    for (const inv of invoices.slice(0, 40)) {
      dynamic.push({
        id: `inv-${inv.id}`,
        label: `Invoice ${inv.number || inv.id?.slice(0, 8)} · ${inv.status || 'unpaid'}`,
        path: `/invoices/${inv.id}`,
        group: 'Invoices',
      })
    }
    for (const c of clients.slice(0, 30)) {
      dynamic.push({
        id: `cli-${c.id}`,
        label: `Client ${c.name}`,
        path: '/clients',
        group: 'Clients',
      })
    }
    for (const qt of quotes.slice(0, 20)) {
      dynamic.push({
        id: `qt-${qt.id}`,
        label: `Quote ${qt.number || qt.id?.slice(0, 8)}`,
        path: '/quotes',
        group: 'Quotes',
      })
    }
    const themeToggle = {
      id: 'theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      group: 'Actions',
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }
    const all = [...STATIC_ACTIONS, themeToggle, ...dynamic]
    if (!q.trim()) return all.slice(0, 18)
    return all.filter((a) => matchesQuery(a, q, ['label', 'group'])).slice(0, 24)
  }, [q, invoices, clients, quotes, theme, setTheme])

  useEffect(() => {
    setIdx(0)
  }, [q])

  const run = (item) => {
    if (!item) return
    onClose()
    if (item.action) item.action()
    else if (item.path) nav(item.path)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        run(items[idx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, idx])

  if (!open) return null

  return (
    <div className="modal-backdrop cmd-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="input cmd-input"
          placeholder="Search pages, invoices, job cards, clients… (↑↓ Enter Esc)"
          aria-label="Command palette search"
          aria-controls="cmd-results"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="cmd-list" id="cmd-results" role="listbox">
          {!items.length && <div className="cmd-empty muted">No matches</div>}
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === idx}
              className={`cmd-item ${i === idx ? 'cmd-active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => run(item)}
            >
              <span>{item.label}</span>
              <span className="cmd-group">{item.group}</span>
            </button>
          ))}
        </div>
        <div className="cmd-footer muted">
          <kbd className="kbd">↑↓</kbd> navigate · <kbd className="kbd">Enter</kbd> open · <kbd className="kbd">Esc</kbd> close
        </div>
      </div>
    </div>
  )
}
