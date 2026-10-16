import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import { StatCard, ProgressBar, formatDateZA, relativeTime, PageFade, EmptyState } from '../components/ui'
import { openWhatsApp, buildReportSummaryShare, buildClientStatement } from '../lib/share'
import ActionDock from '../components/ActionDock'

export default function Dashboard() {
  const { invoices, quotes, tickets, clients, expenses, payments, company, toast } = useApp()
  const openInv = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = openInv.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const paidToday = payments.filter((p) => String(p.date || '').slice(0, 10) === today)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const aged = agedBuckets(invoices)
  const openT = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const totalAged = Object.values(aged.buckets || {}).reduce((s, v) => s + (Number(v) || 0), 0) || 1
  const collectionRate = rev + ar > 0 ? Math.round((rev / (rev + ar)) * 100) : 0
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const partialCount = invoices.filter((i) => i.status === 'partial').length
  const recentPayments = [...payments].slice(-10).reverse()
  const draftQuotes = quotes.filter((q) => String(q.status || 'draft').toLowerCase() === 'draft')

  const needsReminder = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      if (!['overdue', 'partial'].includes(inv.status || '')) continue
      const id = String(inv.clientId)
      if (!map[id]) map[id] = { clientId: id, total: 0, count: 0, overdue: 0, partial: 0 }
      map[id].total += Number(inv.amountDue ?? inv.total) || 0
      map[id].count++
      if (inv.status === 'overdue') map[id].overdue++
      else map[id].partial++
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6)
  }, [invoices])

  const shareSnapshot = () => {
    const text = buildReportSummaryShare({
      rev: formatMoney(rev),
      out: formatMoney(ar),
      collectionRate,
      exp: formatMoney(exp),
      net: formatMoney(rev - exp),
      openCount: openInv.length,
    }, company)
    openWhatsApp('', text)
    toast?.('Opening WhatsApp with dashboard snapshot…', 'success')
  }

  const remindClient = (clientId, channel) => {
    const client = clients.find((c) => String(c.id) === String(clientId))
    if (!client) return
    const text = buildClientStatement(client, invoices, company)
    if (channel === 'wa') openWhatsApp(client.phone, text)
    else openEmail(client.email, `Account reminder — ${company?.name || ''}`, text.replace(/\*/g, ''))
    toast?.('Opening reminder…', 'success')
  }

  const dockItems = [
    { key: 'inv', label: '+ Invoice', to: '/invoices/new', tone: 'primary' },
    { key: 'pay', label: 'Record payment', to: '/payments', tone: 'secondary' },
    { key: 'quote', label: 'Quotes', to: '/quotes' },
    { key: 'job', label: `Jobs (${openT.length})`, to: '/tickets' },
    { key: 'inbox', label: 'WA inbox', to: '/inbox' },
    { key: 'clients', label: 'Clients', to: '/clients' },
    { key: 'reports', label: 'Reports', to: '/reports' },
    { key: 'docs', label: 'Documents', to: '/documents' },
    { key: 'share', label: 'Share snapshot WA', onClick: shareSnapshot, tone: 'secondary' },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Live snapshot · {formatDateZA(new Date().toISOString())} · {collectionRate}% collected</p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
          <Link className="btn btn-secondary" to="/payments">Payments</Link>
          <button type="button" className="btn btn-outline" onClick={shareSnapshot}>Share WA</button>
        </div>
      </div>

      <ActionDock title="Your controls" items={dockItems} />

      <div className="grid-stats">
        <StatCard label="Revenue (paid inv)" value={formatMoney(rev)} tone="good" />
        <StatCard label="Payments collected" value={formatMoney(paymentsTotal)} tone="good" hint={`${payments.length} logs`} />
        <StatCard label="Paid today" value={formatMoney(paidToday)} tone="good" />
        <StatCard label="AR outstanding" value={formatMoney(ar)} tone={ar > 0 ? 'warn' : 'good'} hint={`${openInv.length} open`} />
        <StatCard label="Overdue" value={overdueCount} tone={overdueCount ? 'bad' : 'good'} />
        <StatCard label="Partial" value={partialCount} tone={partialCount ? 'warn' : undefined} />
        <StatCard label="Collection rate" value={`${collectionRate}%`} tone={collectionRate >= 80 ? 'good' : collectionRate >= 50 ? 'warn' : undefined} />
        <StatCard label="Expenses" value={formatMoney(exp)} />
        <StatCard label="Net" value={formatMoney(rev - exp)} tone={rev - exp >= 0 ? 'good' : 'bad'} />
        <StatCard label="Draft quotes" value={draftQuotes.length} />
        <StatCard label="Open jobs" value={openT.length} tone={openT.length ? 'warn' : 'good'} />
        <StatCard label="Clients" value={clients.length} />
      </div>

      {needsReminder.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Clients needing reminder</h3>
            <Link className="btn btn-outline btn-sm" to="/payments">Collect / remind</Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>Overdue or partial balances — one tap WA or email</p>
          {needsReminder.map((row) => {
            const c = clients.find((x) => String(x.id) === String(row.clientId))
            return (
              <div key={row.clientId} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <strong>{c?.name || 'Client'}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(row.total)} · {row.count} inv
                    {row.overdue ? ` · ${row.overdue} overdue` : ''}
                    {row.partial ? ` · ${row.partial} partial` : ''}
                  </div>
                </div>
                <div className="list-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindClient(row.clientId, 'wa')}>Remind WA</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => remindClient(row.clientId, 'email')}>Email</button>
                  <Link className="btn btn-outline btn-sm" to={`/clients`}>Open</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Aged debtors</h3>
          <Link className="btn btn-outline btn-sm" to="/reports">Aged report</Link>
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
            action={<Link className="btn btn-primary btn-sm" to="/payments">Go to payments</Link>}
          />
        )}
        {recentPayments.map((p) => {
          const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
          const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
          return (
            <div key={p.id} className="list-card" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <strong>{formatMoney(p.amount)}</strong>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {formatDateZA(p.date)} · {p.method || 'payment'}
                  {p.reference ? ` · ${p.reference}` : ''}
                </span>
                <div className="muted" style={{ fontSize: 12 }}>{[inv?.number, client?.name].filter(Boolean).join(' · ')}</div>
              </div>
              {p.date ? <span className="muted" style={{ fontSize: 12 }}>{relativeTime(p.date)}</span> : null}
            </div>
          )
        })}
      </div>
    </PageFade>
  )
}

function openEmail(to, subject, body) {
  window.location.href = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
