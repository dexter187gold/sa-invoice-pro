import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { StatCard, StatusBadge, formatDateZA, relativeTime, PageFade, EmptyState } from '../components/ui'
import { openWhatsApp, openEmail, buildClientStatement } from '../lib/share'

export default function Home() {
  const { company, invoices, clients, tickets, quotes, employees, expenses, payments, toast } = useApp()
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const paidToday = payments.filter((p) => String(p.date || '').slice(0, 10) === today)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const overdue = invoices.filter((i) => i.status === 'overdue')
  const partial = invoices.filter((i) => i.status === 'partial')
  const draftQuotes = quotes.filter((q) => String(q.status || '').toLowerCase() === 'draft')
  const collectionRate = rev + ar > 0 ? Math.round((rev / (rev + ar)) * 100) : 0
  const isNew = !clients.length && !invoices.length
  const recentPayments = [...payments].slice(-8).reverse()

  /** Clients with overdue or partial invoices — need reminder */
  const needsReminder = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      if (!['overdue', 'partial', 'unpaid'].includes(inv.status || '')) continue
      const id = String(inv.clientId)
      if (!map[id]) map[id] = { clientId: id, total: 0, overdue: 0, partial: 0, unpaid: 0, count: 0 }
      map[id].total += Number(inv.amountDue ?? inv.total) || 0
      map[id].count++
      if (inv.status === 'overdue') map[id].overdue++
      else if (inv.status === 'partial') map[id].partial++
      else map[id].unpaid++
    }
    return Object.values(map)
      .filter((r) => r.overdue > 0 || r.partial > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [invoices])

  const remindClient = (clientId, channel) => {
    const client = clients.find((c) => String(c.id) === String(clientId))
    if (!client) return toast?.('Client not found', 'error')
    const text = buildClientStatement(client, invoices, company)
    if (channel === 'wa') {
      openWhatsApp(client.phone, text)
      toast?.('Opening client statement reminder…', 'success')
    } else {
      openEmail(client.email, `Account reminder — ${company?.name || 'SA Invoice Pro'}`, text.replace(/\*/g, ''))
      toast?.('Opening email…', 'success')
    }
  }

  const recentInv = [...invoices]
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
    .slice(0, 5)

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>
            Home <span className="muted-pill">{company?.name || 'Workspace'}</span>
          </h1>
          <p className="subtitle">Snapshot · {formatDateZA(new Date().toISOString())} · ZAR</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
          <Link className="btn btn-secondary" to="/payments">Payments</Link>
          <Link className="btn btn-outline" to="/dashboard">Dashboard</Link>
        </div>
      </div>

      {isNew && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green)' }}>
          <h3 style={{ marginTop: 0 }}>Welcome — get paid in three steps</h3>
          <ol>
            <li><Link to="/settings">Set company name, VAT & bank details</Link></li>
            <li><Link to="/clients">Add your first client</Link></li>
            <li><Link to="/invoices/new">Create a tax invoice</Link></li>
          </ol>
        </div>
      )}

      <div className="grid-stats">
        <StatCard label="Outstanding AR" value={formatMoney(ar)} tone={ar > 0 ? 'warn' : 'good'} hint={`${open.length} open`} />
        <StatCard label="Payments collected" value={formatMoney(paymentsTotal)} tone="good" hint={`${payments.length} logged`} />
        <StatCard label="Paid today" value={formatMoney(paidToday)} tone="good" />
        <StatCard label="Paid revenue (invoices)" value={formatMoney(rev)} tone="good" />
        <StatCard label="Collection rate" value={`${collectionRate}%`} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length ? 'bad' : 'good'} />
        <StatCard label="Partial" value={partial.length} tone={partial.length ? 'warn' : undefined} />
        <StatCard label="Open tickets" value={openT.length} tone={openT.length ? 'warn' : undefined} />
      </div>

      {needsReminder.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--warn, #f59e0b)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Clients needing reminder</h3>
            <Link className="btn btn-outline btn-sm" to="/invoices">All open invoices</Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>Overdue or partially paid — send statement / reminder</p>
          {needsReminder.map((row) => {
            const c = clients.find((x) => String(x.id) === String(row.clientId))
            return (
              <div key={row.clientId} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <strong>{c?.name || 'Client'}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(row.total)} due · {row.count} invoice(s)
                    {row.overdue ? ` · ${row.overdue} overdue` : ''}
                    {row.partial ? ` · ${row.partial} partial` : ''}
                  </div>
                </div>
                <div className="list-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindClient(row.clientId, 'wa')}>Remind WA</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => remindClient(row.clientId, 'email')}>Remind email</button>
                  <Link className="btn btn-outline btn-sm" to="/clients">Clients</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent payments</h3>
          <Link className="btn btn-outline btn-sm" to="/payments">All payments</Link>
        </div>
        {!recentPayments.length ? (
          <EmptyState title="No payments yet" hint="Record EFT on the Payments page." action={<Link className="btn btn-primary btn-sm" to="/payments">Record payment</Link>} />
        ) : (
          recentPayments.map((p) => {
            const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
            const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
            return (
              <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong>{formatMoney(p.amount)}</strong>
                  <span className="muted"> · {formatDateZA(p.date)} · {p.method}</span>
                  <div className="muted" style={{ fontSize: 12 }}>{[inv?.number, client?.name].filter(Boolean).join(' · ')}</div>
                </div>
                {p.date ? <span className="muted" style={{ fontSize: 12 }}>{relativeTime(p.date)}</span> : null}
              </div>
            )
          })
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent invoices</h3>
          <Link className="btn btn-outline btn-sm" to="/invoices">View all</Link>
        </div>
        {!recentInv.length && (
          <EmptyState title="No invoices yet" action={<Link className="btn btn-primary" to="/invoices/new">New invoice</Link>} />
        )}
        {recentInv.map((inv) => {
          const due = Number(inv.amountDue ?? inv.total) || 0
          const client = clients.find((c) => String(c.id) === String(inv.clientId))
          return (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="list-card"
              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, textDecoration: 'none', color: 'inherit', alignItems: 'center' }}
            >
              <div>
                <strong>{inv.number || inv.id?.slice(0, 8)}</strong>
                <span className="muted"> · {client?.name || 'No client'} · {formatDateZA(inv.date)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusBadge status={inv.status || 'unpaid'} />
                <strong>{formatMoney(due || inv.total)}</strong>
              </div>
            </Link>
          )
        })}
      </div>
    </PageFade>
  )
}
