
import React from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { agedBuckets } from '../lib/accounting'

export default function Reports() {
  const { invoices, expenses, clients, company } = useApp()
  const paid = invoices.filter((i) => i.status === 'paid' && !i.isCredit)
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const out = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const exp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const vatOut = paid.reduce((s, i) => s + (Number(i.vatAmount) || 0), 0)
  const aged = agedBuckets(invoices)

  const exportCsv = () => {
    const lines = ['Number,Client,Date,Status,Total']
    for (const i of invoices) {
      const c = clients.find((x) => String(x.id) === String(i.clientId))
      lines.push([i.number, JSON.stringify(c?.name || ''), i.date, i.status, i.total].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'invoices-report.csv'
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">{company?.name} · sales, VAT, aged debtors</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>Export invoices CSV</button>
      </div>
      <div className="grid-stats">
        <div className="card stat"><div className="label">Paid sales</div><div className="value">{formatMoney(rev)}</div></div>
        <div className="card stat"><div className="label">Outstanding</div><div className="value">{formatMoney(out)}</div></div>
        <div className="card stat"><div className="label">Expenses</div><div className="value">{formatMoney(exp)}</div></div>
        <div className="card stat"><div className="label">VAT output (paid)</div><div className="value">{formatMoney(vatOut)}</div></div>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Aged receivables</h3>
        <div className="grid-stats">
          {Object.entries(aged.buckets).map(([k, v]) => (
            <div key={k}><div className="muted">{k}</div><strong>{formatMoney(v)}</strong></div>
          ))}
        </div>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Client</th><th>Days</th><th>Due</th><th>Bucket</th></tr></thead>
          <tbody>
            {aged.rows.sort((a, b) => b.days - a.days).map((r) => {
              const c = clients.find((x) => String(x.id) === String(r.clientId))
              return (
                <tr key={r.id}>
                  <td>{r.number}</td>
                  <td>{c?.name}</td>
                  <td>{r.days}</td>
                  <td>{formatMoney(r.due)}</td>
                  <td>{r.bucket}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!aged.rows.length && <p className="muted">No outstanding invoices.</p>}
      </div>
    </div>
  )
}
