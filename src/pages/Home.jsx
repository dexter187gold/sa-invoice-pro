
import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'

export default function Home() {
  const { company, invoices, clients, tickets, quotes } = useApp()
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Home</h1>
          <p className="subtitle">{company?.name} · dashboard snapshot</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
          <Link className="btn btn-secondary" to="/clients">Clients</Link>
        </div>
      </div>
      <div className="grid-stats">
        <div className="card stat"><div className="label">Outstanding AR</div><div className="value">{formatMoney(ar)}</div></div>
        <div className="card stat"><div className="label">Paid revenue</div><div className="value">{formatMoney(rev)}</div></div>
        <div className="card stat"><div className="label">Clients</div><div className="value">{clients.length}</div></div>
        <div className="card stat"><div className="label">Open tickets</div><div className="value">{tickets.filter((t) => !['closed','resolved'].includes(t.status)).length}</div></div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Quick links</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <Link className="btn btn-outline" to="/invoices">Invoices ({invoices.length})</Link>
          <Link className="btn btn-outline" to="/quotes">Quotes ({quotes.length})</Link>
          <Link className="btn btn-outline" to="/tickets">Tickets</Link>
          <Link className="btn btn-outline" to="/accounting">Accounting</Link>
          <Link className="btn btn-outline" to="/settings">Settings</Link>
        </div>
      </div>
    </div>
  )
}
