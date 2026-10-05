import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import { StatCard, ProgressBar, formatDateZA, relativeTime } from '../components/ui'

export default function Dashboard() {
  const { invoices, quotes, tickets, clients, expenses, payments } = useApp()
  const openInv = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = openInv.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const aged = agedBuckets(invoices)
  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const totalAged = Object.values(aged.buckets || {}).reduce((s, v) => s + (Number(v) || 0), 0) || 1
  const collectionRate = rev + ar > 0 ? Math.round((rev / (rev + ar)) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Live operational snapshot · {formatDateZA(new Date().toISOString())}</p>
        </div>
        <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
      </div>
      <div className="grid-stats">
        <StatCard label="Revenue (paid)" value={formatMoney(rev)} tone="good" />
        <StatCard label="AR outstanding" value={formatMoney(ar)} tone={ar > 0 ? 'warn' : 'good'} hint={`${openInv.length} open`} />
        <StatCard label="Expenses" value={formatMoney(exp)} />
        <StatCard label="Net" value={formatMoney(rev - exp)} tone={rev - exp >= 0 ? 'good' : 'bad'} />
        <StatCard label="Collection rate" value={`${collectionRate}%`} hint="Paid / (paid + AR)" />
        <StatCard label="Quotes" value={quotes.length} />
        <StatCard label="Open tickets" value={openT.length} tone={openT.length ? 'warn' : undefined} />
        <StatCard label="Clients" value={clients.length} />
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Aged debtors</h3>
        <div className="grid-stats">
          {[
            ['Current', aged.buckets.current, 'good'],
            ['1–30', aged.buckets.d30, null],
            ['31–60', aged.buckets.d60, 'warn'],
            ['61–90', aged.buckets.d90, 'warn'],
            ['90+', aged.buckets.older, 'bad'],
          ].map(([label, val, tone]) => (
            <div key={label}>
              <div className="muted">{label}</div>
              <strong>{formatMoney(val)}</strong>
              <ProgressBar value={val} max={totalAged} tone={tone} />
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent payments</h3>
        {!payments.length && <p className="muted">No payments recorded yet.</p>}
        {payments.slice(-8).reverse().map((p) => (
          <div key={p.id} className="list-card" style={{ marginBottom: 6 }}>
            {formatMoney(p.amount)} · {formatDateZA(p.date)} · {p.method || 'payment'}
            {p.reference ? ` · ${p.reference}` : ''}
            {p.date ? <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{relativeTime(p.date)}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
