import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'

/** Icon + dropdown of common shortcuts — lives in the top bar next to Help / notifications. */
export default function QuickActions() {
  const { invoices, clients, tickets, quotes, expenses, payments } = useApp()
  const [open, setOpen] = useState(false)
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

  const items = [
    { to: '/invoices/new', icon: '＋', label: 'New invoice', sub: 'Bill a client' },
    { to: '/quotes', icon: '📋', label: 'Quotes', sub: `${quotes.length} on file · ${draftQuotes.length} draft` },
    { to: '/clients', icon: '👥', label: 'Clients', sub: `${clients.length} customers` },
    { to: '/tickets', icon: '🔧', label: 'Job cards', sub: `${openT.length} open` },
    { to: '/payments', icon: '💳', label: 'Payments', sub: `${formatMoney(paymentsTotal)} · ${payments.length} logged` },
    { to: '/expenses', icon: '🧾', label: 'Expenses', sub: formatMoney(exp) },
    { to: '/reports', icon: '📊', label: 'Reports', sub: 'AR · CSV export' },
    { to: '/dashboard', icon: '📈', label: 'Dashboard', sub: `${collectionRate}% collected` },
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
    <div className="quick-actions-wrap" ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline btn-sm quick-actions-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick actions"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Quick actions"
      >
        <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>⚡</span>
        <span className="quick-actions-btn-label">Actions</span>
      </button>
      {open && (
        <div className="quick-actions-panel" role="menu" aria-label="Quick actions">
          <div className="quick-actions-head">
            <strong>Quick actions</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="quick-actions-list">
            {items.map((item) => (
              <Link
                key={item.to}
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
      )}
    </div>
  )
}
