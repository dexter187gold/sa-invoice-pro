import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import { StatCard, ProgressBar, formatDateZA, relativeTime, PageFade, EmptyState } from '../components/ui'

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
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const recentPayments = [...payments].slice(-10).reverse()

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Live operational snapshot · {formatDateZA(new Date().toISOString())}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
          <Link className="btn btn-outline" to="/reports">Reports</Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Revenue (paid)" value={formatMoney(rev)} tone="good" />
        <StatCard label="AR outstanding" value={formatMoney(ar)} tone={ar > 0 ? 'warn' : 'good'} hint={`${openInv.length} open`} />
        <StatCard label="Overdue invoices" value={overdueCount} tone={overdueCount ? 'bad' : 'good'} />
        <StatCard label="Expenses" value={formatMoney(exp)} />
        <StatCard label="Net" value={formatMoney(rev - exp)} tone={rev - exp >= 0 ? 'good' : 'bad'} />
        <StatCard label="Collection rate" value={`${collectionRate}%`} hint="Paid / (paid + AR)" tone={collectionRate >= 80 ? 'good' : collectionRate >= 50 ? 'warn' : undefined} />
        <StatCard label="Quotes" value={quotes.length} />
        <StatCard label="Open tickets" value={openT.length} tone={openT.length ? 'warn' : undefined} />
        <StatCard label="Clients" value={clients.length} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Aged debtors</h3>
          <Link className="btn btn-outline btn-sm" to="/invoices?status=overdue">View overdue</Link>
        </div>
        <div className="grid-stats" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          {[
            ['Current', aged.buckets?.current, 'good'],
            ['1–30 days', aged.buckets?.d30, null],
            ['31–60 days', aged.buckets?.d60, 'warn'],
            ['61–90 days', aged.buckets?.d90, 'warn'],
            ['90+ days', aged.buckets?.older, 'bad'],
          ].map(([label, val, tone]) => (
            <div key={label} className="card stat" style={{ boxShadow: 'none' }}>
              <div className="label">{label}</div>
              <div className="value" style={{ fontSize: '1.05rem' }}>{formatMoney(val)}</div>
              <ProgressBar value={val} max={totalAged} tone={tone} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent payments</h3>
          <Link className="btn btn-outline btn-sm" to="/payments">All payments</Link>
        </div>
        {!recentPayments.length && (
          <EmptyState
            title="No payments recorded yet"
            hint="Record EFT or run PayFast checkout from the Payments page."
            action={<Link className="btn btn-primary btn-sm" to="/payments">Go to payments</Link>}
          />
        )}
        {recentPayments.map((p) => (
          <div key={p.id} className="list-card" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <strong>{formatMoney(p.amount)}</strong>
              <span className="muted" style={{ marginLeft: 8 }}>
                {formatDateZA(p.date)} · {p.method || 'payment'}
                {p.reference ? ` · ${p.reference}` : ''}
              </span>
            </div>
            {p.date ? <span className="muted" style={{ fontSize: 12 }}>{relativeTime(p.date)}</span> : null}
          </div>
        ))}
      </div>
    </PageFade>
  )
}
