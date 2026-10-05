
import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { StatCard, formatDateZA } from '../components/ui'

export default function Home() {
  const { company, invoices, clients, tickets, quotes, employees, expenses, payments } = useApp()
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const overdue = invoices.filter((i) => i.status === 'overdue')

  const quick = [
    { to: '/invoices/new', label: 'New invoice', sub: 'Bill a client' },
    { to: '/quotes', label: 'Quotes', sub: `${quotes.length} on file` },
    { to: '/clients', label: 'Clients', sub: `${clients.length} customers` },
    { to: '/payroll', label: 'Payroll', sub: `${employees.length} staff` },
    { to: '/expenses', label: 'Expenses', sub: formatMoney(exp) },
    { to: '/documents', label: 'Documents', sub: 'SLA · POPIA · letters' },
    { to: '/reports', label: 'Reports', sub: 'AR · CSV export' },
    { to: '/settings', label: 'Settings', sub: 'Company · VAT · backup' },
  ]

  const recentInv = [...invoices]
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
    .slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            Home <span className="muted-pill">{company?.name || 'Workspace'}</span>
          </h1>
          <p className="subtitle">
            Snapshot · {formatDateZA(new Date().toISOString())} · ZAR
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
          <Link className="btn btn-secondary" to="/payroll">Run payroll</Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Outstanding AR" value={formatMoney(ar)} tone={ar > 0 ? 'warn' : 'good'} hint={`${open.length} open invoice(s)`} />
        <StatCard label="Paid revenue" value={formatMoney(rev)} tone="good" />
        <StatCard label="Expenses" value={formatMoney(exp)} />
        <StatCard label="Net (paid − exp)" value={formatMoney(rev - exp)} tone={rev - exp >= 0 ? 'good' : 'bad'} />
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Open tickets" value={openT.length} tone={openT.length ? 'warn' : undefined} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length ? 'bad' : 'good'} />
        <StatCard label="Payments logged" value={payments.length} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Quick actions</h3>
        <div className="quick-grid">
          {quick.map((q) => (
            <Link key={q.to} className="quick-tile" to={q.to}>
              <strong>{q.label}</strong>
              <span>{q.sub}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent invoices</h3>
          <Link className="btn btn-outline btn-sm" to="/invoices">View all</Link>
        </div>
        {!recentInv.length && <p className="muted" style={{ marginBottom: 0 }}>No invoices yet — create your first one.</p>}
        {recentInv.map((inv) => {
          const due = Number(inv.amountDue ?? inv.total) || 0
          return (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="list-card"
              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, textDecoration: 'none', color: 'inherit' }}
            >
              <div>
                <strong>{inv.number || 'Invoice'}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDateZA(inv.date)} · {inv.status || 'unpaid'}
                </div>
              </div>
              <strong>{formatMoney(inv.total || due)}</strong>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
