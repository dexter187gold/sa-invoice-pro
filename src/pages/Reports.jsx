import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import {
  StatCard, ProgressBar, EmptyState, PageFade, formatDateZA, SearchInput, matchesQuery, StatusBadge,
} from '../components/ui'

export default function Reports() {
  const { invoices, expenses, clients, company, payments } = useApp()
  const [q, setQ] = useState('')

  const paid = invoices.filter((i) => i.status === 'paid' && !i.isCredit)
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const out = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const vatOut = paid.reduce((s, i) => s + (Number(i.vatAmount) || 0), 0)
  const aged = agedBuckets(invoices)
  const totalAged = Object.values(aged.buckets || {}).reduce((s, v) => s + (Number(v) || 0), 0) || 1
  const collectionRate = rev + out > 0 ? Math.round((rev / (rev + out)) * 100) : 0
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const agedRows = useMemo(() => {
    let rows = [...(aged.rows || [])].sort((a, b) => b.days - a.days)
    if (q.trim()) {
      rows = rows.filter((r) => {
        const c = clients.find((x) => String(x.id) === String(r.clientId))
        return matchesQuery(
          { ...r, clientName: c?.name || '' },
          q,
          ['number', 'bucket', 'clientName']
        )
      })
    }
    return rows
  }, [aged.rows, clients, q])

  const exportCsv = () => {
    const lines = ['Number,Client,Date,Status,Total,AmountDue']
    for (const i of invoices) {
      const c = clients.find((x) => String(x.id) === String(i.clientId))
      lines.push(
        [i.number, JSON.stringify(c?.name || ''), i.date, i.status, i.total, i.amountDue ?? i.total].join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `invoices-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const exportAgedCsv = () => {
    const lines = ['Invoice,Client,Days,Due,Bucket']
    for (const r of aged.rows || []) {
      const c = clients.find((x) => String(x.id) === String(r.clientId))
      lines.push([r.number, JSON.stringify(c?.name || ''), r.days, r.due, r.bucket].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aged-debtors-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const bucketLabels = {
    current: 'Current',
    d30: '1–30 days',
    d60: '31–60 days',
    d90: '61–90 days',
    older: '90+ days',
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">
            {company?.name || 'Workspace'} · sales, VAT, aged debtors · {formatDateZA(new Date().toISOString())}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>Export invoices CSV</button>
          <button type="button" className="btn btn-outline" onClick={exportAgedCsv}>Export aged CSV</button>
          <Link className="btn btn-outline" to="/accounting">Accounting</Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Paid sales" value={formatMoney(rev)} tone="good" />
        <StatCard label="Outstanding AR" value={formatMoney(out)} tone={out > 0 ? 'warn' : 'good'} />
        <StatCard label="Collection rate" value={`${collectionRate}%`} hint="Paid / (paid + AR)" />
        <StatCard label="Expenses" value={formatMoney(exp)} />
        <StatCard label="Net (paid − exp)" value={formatMoney(rev - exp)} tone={rev - exp >= 0 ? 'good' : 'bad'} />
        <StatCard label="VAT output (paid)" value={formatMoney(vatOut)} />
        <StatCard label="Payments logged" value={formatMoney(paymentsTotal)} />
        <StatCard label="Open invoices" value={open.length} tone={open.length ? 'warn' : undefined} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Aged receivables</h3>
        <div className="grid-stats">
          {Object.entries(aged.buckets || {}).map(([k, v]) => {
            const tone = k === 'older' ? 'bad' : k === 'd90' || k === 'd60' ? 'warn' : k === 'current' ? 'good' : null
            return (
              <div key={k} className="card stat" style={{ boxShadow: 'none' }}>
                <div className="label">{bucketLabels[k] || k}</div>
                <div className="value" style={{ fontSize: '1.05rem' }}>{formatMoney(v)}</div>
                <ProgressBar value={v} max={totalAged} tone={tone} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="toolbar sticky-tools">
        <SearchInput value={q} onChange={setQ} placeholder="Filter aged table by invoice or client…" />
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Days</th>
              <th>Due</th>
              <th>Bucket</th>
            </tr>
          </thead>
          <tbody>
            {agedRows.map((r) => {
              const c = clients.find((x) => String(x.id) === String(r.clientId))
              return (
                <tr key={r.id}>
                  <td>
                    <Link to={`/invoices/${r.id}`}>{r.number}</Link>
                  </td>
                  <td>{c?.name || '—'}</td>
                  <td>{r.days}</td>
                  <td>{formatMoney(r.due)}</td>
                  <td>
                    <StatusBadge
                      status={r.bucket === 'older' || r.bucket === 'd90' ? 'overdue' : r.bucket === 'current' ? 'paid' : 'partial'}
                      map={{
                        paid: '',
                        partial: 'warn',
                        overdue: 'bad',
                      }}
                    />
                    <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                      {bucketLabels[r.bucket] || r.bucket}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!agedRows.length && (
          <EmptyState
            title={aged.rows?.length ? 'No matches' : 'No outstanding invoices'}
            hint={aged.rows?.length ? 'Clear the filter.' : 'All clear — no aged debtors.'}
          />
        )}
      </div>
    </PageFade>
  )
}
