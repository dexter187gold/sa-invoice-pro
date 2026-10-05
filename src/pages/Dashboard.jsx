
import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'

export default function Dashboard() {
  const { invoices, quotes, tickets, clients, expenses, payments } = useApp()
  const openInv = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = openInv.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const aged = agedBuckets(invoices)
  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Live operational snapshot (separate from Home summary)</p>
        </div>
        <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
      </div>
      <div className="grid-stats">
        <div className="card stat"><div className="label">Revenue (paid)</div><div className="value">{formatMoney(rev)}</div></div>
        <div className="card stat"><div className="label">AR outstanding</div><div className="value">{formatMoney(ar)}</div></div>
        <div className="card stat"><div className="label">Expenses</div><div className="value">{formatMoney(exp)}</div></div>
        <div className="card stat"><div className="label">Net</div><div className="value">{formatMoney(rev - exp)}</div></div>
        <div className="card stat"><div className="label">Open invoices</div><div className="value">{openInv.length}</div></div>
        <div className="card stat"><div className="label">Quotes</div><div className="value">{quotes.length}</div></div>
        <div className="card stat"><div className="label">Open tickets</div><div className="value">{openT.length}</div></div>
        <div className="card stat"><div className="label">Clients</div><div className="value">{clients.length}</div></div>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Aged debtors</h3>
        <div className="grid-stats">
          <div><div className="muted">Current</div><strong>{formatMoney(aged.buckets.current)}</strong></div>
          <div><div className="muted">1–30</div><strong>{formatMoney(aged.buckets.d30)}</strong></div>
          <div><div className="muted">31–60</div><strong>{formatMoney(aged.buckets.d60)}</strong></div>
          <div><div className="muted">61–90</div><strong>{formatMoney(aged.buckets.d90)}</strong></div>
          <div><div className="muted">90+</div><strong>{formatMoney(aged.buckets.older)}</strong></div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent payments</h3>
        {!payments.length && <p className="muted">No payments recorded yet.</p>}
        {payments.slice(-8).reverse().map((p) => (
          <div key={p.id} className="list-card" style={{ marginBottom: 6 }}>
            {formatMoney(p.amount)} · {(p.date || '').slice(0, 10)} · {p.method || 'payment'}
            {p.reference ? ` · ${p.reference}` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
