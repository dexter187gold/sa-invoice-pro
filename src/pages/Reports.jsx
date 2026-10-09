import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'
import {
  StatCard, ProgressBar, EmptyState, PageFade, formatDateZA, SearchInput, matchesQuery,
  StatusBadge, downloadCsv,
} from '../components/ui'

export default function Reports() {
  const { invoices, expenses, clients, company, payments, quotes } = useApp()
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
  const stamp = new Date().toISOString().slice(0, 10)

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

  const clientName = (id) => clients.find((x) => String(x.id) === String(id))?.name || ''

  const exportInvoicesCsv = () => {
    downloadCsv(`invoices-report-${stamp}.csv`,
      ['Number', 'Client', 'Date', 'Due date', 'Status', 'Exclusive', 'VAT', 'Total', 'Amount due', 'Notes'],
      invoices.map((i) => [
        i.number || '', clientName(i.clientId), i.date || '', i.dueDate || '', i.status || '',
        Number(i.exclusive) || 0, Number(i.vatAmount) || 0, Number(i.total) || 0,
        Number(i.amountDue ?? i.total) || 0, i.notes || '',
      ])
    )
  }

  const exportAgedCsv = () => {
    downloadCsv(`aged-debtors-${stamp}.csv`,
      ['Invoice', 'Client', 'Days', 'Amount due', 'Bucket', 'Due date'],
      (aged.rows || []).map((r) => [
        r.number || '', clientName(r.clientId), r.days, r.due, r.bucket, r.dueDate || r.date || '',
      ])
    )
  }

  const exportExpensesCsv = () => {
    downloadCsv(`expenses-${stamp}.csv`,
      ['Date', 'Description', 'Category', 'Vendor', 'Account', 'Amount'],
      expenses.map((e) => [
        e.date || '', e.description || '', e.category || '', e.vendor || '', e.accountCode || '', Number(e.amount) || 0,
      ])
    )
  }

  const exportPaymentsCsv = () => {
    downloadCsv(`payments-${stamp}.csv`,
      ['Date', 'Amount', 'Method', 'Reference', 'Invoice id'],
      payments.map((p) => [
        p.date || '', Number(p.amount) || 0, p.method || '', p.reference || '', p.invoiceId || '',
      ])
    )
  }

  const exportSummaryCsv = () => {
    downloadCsv(`summary-${stamp}.csv`,
      ['Metric', 'Value'],
      [
        ['Company', company?.name || ''],
        ['Report date', stamp],
        ['Paid sales', rev],
        ['Outstanding AR', out],
        ['Collection rate %', collectionRate],
        ['Expenses', exp],
        ['Net (paid - expenses)', rev - exp],
        ['VAT output (paid invoices)', vatOut],
        ['Payments logged', paymentsTotal],
        ['Open invoices', open.length],
        ['Paid invoices', paid.length],
        ['Quotes', quotes?.length || 0],
        ['Clients', clients.length],
        ['AR current', aged.buckets?.current || 0],
        ['AR 1-30', aged.buckets?.d30 || 0],
        ['AR 31-60', aged.buckets?.d60 || 0],
        ['AR 61-90', aged.buckets?.d90 || 0],
        ['AR 90+', aged.buckets?.older || 0],
      ]
    )
  }

  const exportAllPack = () => {
    exportSummaryCsv()
    exportInvoicesCsv()
    exportAgedCsv()
    exportExpensesCsv()
    exportPaymentsCsv()
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
          <button type="button" className="btn btn-primary" onClick={exportAllPack}>Export pack (5 CSVs)</button>
          <button type="button" className="btn btn-secondary" onClick={exportSummaryCsv}>Summary</button>
          <button type="button" className="btn btn-outline" onClick={exportInvoicesCsv}>Invoices</button>
          <button type="button" className="btn btn-outline" onClick={exportAgedCsv}>Aged</button>
          <button type="button" className="btn btn-outline" onClick={exportExpensesCsv}>Expenses</button>
          <button type="button" className="btn btn-outline" onClick={exportPaymentsCsv}>Payments</button>
          <Link className="btn btn-outline" to="/accounting">Accounting</Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Paid sales" value={formatMoney(rev)} tone="good" />
        <StatCard label="Outstanding AR" value={formatMoney(out)} tone={out > 0 ? 'warn' : 'good'} />
        <StatCard label="Collection rate" value={`${collectionRate}%`} hint="Paid / (paid + AR)" tone={collectionRate >= 80 ? 'good' : collectionRate >= 50 ? 'warn' : undefined} />
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
                <tr key={r.id} className={r.bucket === 'older' || r.bucket === 'd90' ? 'row-overdue' : ''}>
                  <td>
                    <Link to={`/invoices/${r.id}`}>{r.number}</Link>
                  </td>
                  <td>{c?.name || '—'}</td>
                  <td>{r.days > 0 ? <span className="text-danger">{r.days}</span> : r.days}</td>
                  <td>{formatMoney(r.due)}</td>
                  <td>
                    <StatusBadge
                      status={r.bucket === 'older' || r.bucket === 'd90' ? 'overdue' : r.bucket === 'current' ? 'paid' : 'partial'}
                      map={{ paid: '', partial: 'warn', overdue: 'bad' }}
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
            hint={aged.rows?.length ? 'Clear the filter.' : 'All clear — no aged debtors. Export pack still works for historical CSVs.'}
          />
        )}
      </div>
    </PageFade>
  )
}
