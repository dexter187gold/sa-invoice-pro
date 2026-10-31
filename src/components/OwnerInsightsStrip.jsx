import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import { Sync } from '../lib/sync'
import { getWorkspaceSyncMeta } from '../lib/workspaceSync'

/** Business Command snapshot for Home / Dashboard — live from local books. */
export default function OwnerInsightsStrip() {
  const { invoices = [], quotes = [], tickets = [], payments = [], expenses = [], clients = [] } = useApp()
  const meta = useMemo(() => getWorkspaceSyncMeta(), [])

  const kpis = useMemo(() => {
    const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
    const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
    const aging = agedBuckets(invoices)
    const overdue = aging.buckets.d30 + aging.buckets.d60 + aging.buckets.d90 + aging.buckets.older
    const month = new Date().toISOString().slice(0, 7)
    const paidM = invoices
      .filter((i) => i.status === 'paid' && String(i.date || '').startsWith(month) && !i.isCredit)
      .reduce((s, i) => s + (Number(i.total) || 0), 0)
    const openQuotes = quotes.filter((q) => ['draft', 'sent', 'pending'].includes(String(q.status || 'draft').toLowerCase())).length
    const openTickets = tickets.filter((t) => !['closed', 'done', 'resolved'].includes(String(t.status || '').toLowerCase())).length
    const expM = expenses.filter((e) => String(e.date || '').startsWith(month)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return {
      ar,
      overdue,
      paidM,
      openQuotes,
      openTickets,
      clients: clients.length,
      expM,
      collectionsM: payments
        .filter((p) => String(p.date || '').startsWith(month))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0),
    }
  }, [invoices, quotes, tickets, payments, expenses, clients])

  const cloud = Sync.isLoggedIn()

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Business Command</h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
            Live from this device · Cloud {cloud ? 'connected' : 'offline'}
            {meta?.at ? ` · last sync ${new Date(meta.at).toLocaleString()}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-outline btn-sm" to="/accounting">Books</Link>
          <Link className="btn btn-outline btn-sm" to="/bank">Bank</Link>
          <Link className="btn btn-outline btn-sm" to="/settings">Cloud settings</Link>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, marginTop: 12 }}>
        <K label="Open AR" value={formatMoney(kpis.ar)} to="/invoices" />
        <K label="Overdue AR" value={formatMoney(kpis.overdue)} to="/accounting" />
        <K label="Paid (month)" value={formatMoney(kpis.paidM)} to="/invoices" />
        <K label="Collected" value={formatMoney(kpis.collectionsM)} to="/payments" />
        <K label="Expenses" value={formatMoney(kpis.expM)} to="/expenses" />
        <K label="Open quotes" value={String(kpis.openQuotes)} to="/quotes" />
        <K label="Open tickets" value={String(kpis.openTickets)} to="/tickets" />
        <K label="Clients" value={String(kpis.clients)} to="/clients" />
      </div>
    </div>
  )
}

function K({ label, value, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border, #334155)', background: 'var(--bg, transparent)' }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{value}</div>
      </div>
    </Link>
  )
}
