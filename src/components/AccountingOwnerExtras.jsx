import React, { useMemo } from 'react'
import { formatMoney } from '../lib/money'
import {
  comparePeriods,
  debtorConcentration,
  monthEndChecklist,
  revenueLedgerVariance,
  previousPeriod,
  periodLabel,
} from '../lib/accounting'
import { StatCard, LoadingButton } from './ui'

/** Owner extras: period compare + month-end close (keeps Accounting.jsx lean). */
export function AccountingComparePanel({ invoices, expenses, payments, journal, period }) {
  const cmp = useMemo(
    () => comparePeriods({ invoices: invoices || [], expenses: expenses || [], payments: payments || [], period }),
    [invoices, expenses, payments, period],
  )
  const concentration = useMemo(() => debtorConcentration(invoices || []), [invoices])
  const revVar = useMemo(
    () => revenueLedgerVariance(invoices || [], journal || [], period),
    [invoices, journal, period],
  )

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        Period compare · {periodLabel(period)} vs {periodLabel(previousPeriod(period)) || 'prior'}
      </h3>
      <p className="muted" style={{ fontSize: 13 }}>
        Operational KPIs from invoices, payments and expenses (not only ledger).
      </p>
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
        <StatCard label="Revenue" value={formatMoney(cmp.current.revenue)} />
        <StatCard label="Prior revenue" value={formatMoney(cmp.previous.revenue)} />
        <StatCard label="Revenue Δ%" value={`${cmp.delta.revenuePct.toFixed(1)}%`} />
        <StatCard label="Expenses" value={formatMoney(cmp.current.expenses)} />
        <StatCard label="Prior expenses" value={formatMoney(cmp.previous.expenses)} />
        <StatCard label="Expenses Δ%" value={`${cmp.delta.expensesPct.toFixed(1)}%`} />
        <StatCard label="Collections" value={formatMoney(cmp.current.collections)} />
        <StatCard label="Collections Δ%" value={`${cmp.delta.collectionsPct.toFixed(1)}%`} />
        <StatCard label="Net" value={formatMoney(cmp.current.net)} />
        <StatCard label="Net Δ%" value={`${cmp.delta.netPct.toFixed(1)}%`} />
        <StatCard label="Invoices #" value={String(cmp.current.invoices)} />
      </div>
      <h4 style={{ marginTop: 20 }}>Invoice vs ledger revenue</h4>
      <p className="muted" style={{ fontSize: 13 }}>
        Invoices {formatMoney(revVar.invoiceRevenue)} · Ledger (4000/4100) {formatMoney(revVar.ledgerRevenue)} · Variance{' '}
        {formatMoney(revVar.variance)}
        {Math.abs(revVar.variance) > 1 ? ' — run Auto-post ops if ledger is behind.' : ' — aligned.'}
      </p>
      <h4>Debtor concentration</h4>
      {!concentration.length && <p className="muted">No open AR.</p>}
      {concentration.map((r) => (
        <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <span>{r.name}</span>
          <strong>
            {formatMoney(r.total)} · {r.sharePct.toFixed(0)}%
          </strong>
        </div>
      ))}
    </div>
  )
}

export function AccountingMonthEndPanel({
  invoices,
  expenses,
  journal,
  bankTxns,
  payments,
  accounts,
  period,
  busy,
  onAutoPost,
  onGoCash,
  onGoAging,
  onExportVat,
  onExportPl,
  onExportTb,
}) {
  const monthEnd = useMemo(
    () => monthEndChecklist({ invoices, expenses, journal, bankTxns, payments, accounts, period }),
    [invoices, expenses, journal, bankTxns, payments, accounts, period],
  )

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        Month-end close · {periodLabel(period)} · {monthEnd.score}%
      </h3>
      <p className="muted" style={{ fontSize: 13 }}>
        {monthEnd.done}/{monthEnd.total} checks passed — owner workspace checklist.
      </p>
      {monthEnd.items.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <strong style={{ color: c.ok ? 'var(--green, #08794e)' : '#b91c1c' }}>
              {c.ok ? '✓' : '!'} {c.label}
            </strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {c.detail}
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <LoadingButton loading={busy} className="btn btn-primary" onClick={onAutoPost}>
          Auto-post missing
        </LoadingButton>
        <button type="button" className="btn btn-outline" onClick={onGoCash}>
          Bank recon
        </button>
        <button type="button" className="btn btn-outline" onClick={onGoAging}>
          Chase AR
        </button>
        <button type="button" className="btn btn-outline" onClick={onExportVat}>
          VAT pack
        </button>
        <button type="button" className="btn btn-outline" onClick={onExportPl}>
          P&amp;L CSV
        </button>
        <button type="button" className="btn btn-outline" onClick={onExportTb}>
          TB CSV
        </button>
      </div>
    </div>
  )
}
