import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'

/** Floating quick-actions — expanded control surface Q1–Q5 */
export default function QuickActions({ open: controlledOpen, onOpenChange, hideTrigger = false }) {
  const { invoices, clients, tickets, quotes, expenses, payments, online } = useApp()
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen ?? localOpen
  const setOpen = onOpenChange ?? setLocalOpen
  const rootRef = useRef(null)

  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const draftQuotes = quotes.filter((q) => String(q.status || '').toLowerCase() === 'draft')
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const openInv = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = openInv.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const collectionRate = rev + ar > 0 ? Math.round((rev / (rev + ar)) * 100) : 0
  const overdue = invoices.filter((i) => i.status === 'overdue').length

  const groups = [
    {
      title: 'Create',
      items: [
        { to: '/invoices/new', icon: '＋', label: 'New invoice', sub: 'Bill a client' },
        { to: '/quotes', icon: '📋', label: 'Quotes', sub: `${quotes.length} · ${draftQuotes.length} draft` },
        { to: '/clients', icon: '👥', label: 'Clients', sub: `${clients.length} on file` },
        { to: '/tickets', icon: '🔧', label: 'Job card', sub: `${openT.length} open` },
      ],
    },
    {
      title: 'Collect & track',
      items: [
        { to: '/payments', icon: '💳', label: 'Payments', sub: `${formatMoney(paymentsTotal)} · ${payments.length}` },
        { to: '/invoices', icon: '⚠️', label: 'Overdue', sub: `${overdue} flagged · AR ${formatMoney(ar)}` },
        { to: '/expenses', icon: '🧾', label: 'Expenses', sub: formatMoney(exp) },
        { to: '/reports', icon: '📊', label: 'Reports', sub: 'AR · aged · CSV' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { to: '/dashboard', icon: '📈', label: 'Dashboard', sub: `${collectionRate}% collected` },
        { to: '/inbox', icon: '💬', label: 'WhatsApp inbox', sub: online ? 'Online' : 'Offline queue' },
        { to: '/documents', icon: '📁', label: 'Documents', sub: '18+ templates' },
        { to: '/settings', icon: '⚙️', label: 'Settings', sub: 'Company · sync · theme' },
      ],
    },
  ]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
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

  return (
    <div className="quick-actions-fab-wrap" ref={rootRef}>
      {!hideTrigger && <button
        type="button"
        className="quick-actions-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick actions"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Quick actions — more control"
      >
        <svg className="quick-actions-fab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>}
      {open && (
        <div className="quick-actions-panel" role="menu" aria-label="Quick actions">
          <div className="quick-actions-head">
            <strong>Command centre</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Close</button>
          </div>
          {groups.map((g) => (
            <div key={g.title} className="quick-actions-group">
              <div className="nav-section" style={{ padding: '6px 10px 2px' }}>{g.title}</div>
              <div className="quick-actions-list">
                {g.items.map((item) => (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    role="menuitem"
                    className="quick-actions-item"
                    onClick={() => setOpen(false)}
                  >
                    <span className="quick-actions-icon" aria-hidden>{item.icon}</span>
                    <span className="quick-actions-text">
                      <strong>{item.label}</strong>
                      <span className="muted">{item.sub}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
