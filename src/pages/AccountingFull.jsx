import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  DEFAULT_COA,
  JOURNAL_TEMPLATES,
  buildTrialBalance,
  buildProfitAndLoss,
  buildBalanceSheet,
  agedBuckets,
  expensePayables,
  vatSummary,
  monthlyRevenueTrend,
  monthlyExpenseTrend,
  cashPosition,
  booksHealth,
  topExpenseCategories,
  periodLabel,
} from '../lib/accounting'
import {
  StatCard, EmptyState, PageFade, formatDateZA, LoadingButton, downloadCsv,
} from '../components/ui'
import { AccountingComparePanel, AccountingMonthEndPanel } from '../components/AccountingOwnerExtras'

export default function Accounting() {
  const { invoices, expenses, payments, journal, accounts, bankTxns, refresh, toast } = useApp()
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [busy, setBusy] = useState(false)
  const [bankForm, setBankForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    reference: '',
  })
  const [jForm, setJForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    memo: '',
    debitCode: '1000',
    creditCode: '4000',
    amount: '',
  })

  const inP = (d) => !period || String(d || '').startsWith(period)
  const paid = (invoices || []).filter((i) => i.status === 'paid' && !i.isCredit && inP(i.date))
  const openInv = (invoices || []).filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const ar = openInv.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const exp = (expenses || []).filter((e) => inP(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const unrec = (bankTxns || []).filter((t) => !t.reconciled)
  const jFiltered = (journal || []).filter((j) => inP(j.date))
  const jAll = journal || []

  const tb = useMemo(() => buildTrialBalance(jFiltered, accounts), [jFiltered, accounts])
  const pl = useMemo(() => buildProfitAndLoss(jFiltered, accounts), [jFiltered, accounts])
  const bs = useMemo(() => buildBalanceSheet(jAll, accounts), [jAll, accounts])
  const aging = useMemo(() => agedBuckets(invoices || []), [invoices])
  const ap = useMemo(() => expensePayables(expenses || []), [expenses])
  const vat = useMemo(() => vatSummary(invoices || [], expenses || [], period), [invoices, expenses, period])
  const revTrend = useMemo(() => monthlyRevenueTrend(invoices || [], 6), [invoices])
  const cash = useMemo(() => cashPosition(bankTxns || [], jFiltered), [bankTxns, jFiltered])
  const health = useMemo(
    () => booksHealth({ invoices, expenses, journal, accounts, bankTxns, payments }),
    [invoices, expenses, journal, accounts, bankTxns, payments],
  )
  const topExp = useMemo(() => topExpenseCategories(expenses || [], period), [expenses, period])
  const tbDelta = Math.abs((tb.totalDr || 0) - (tb.totalCr || 0))
  const maxRev = Math.max(1, ...revTrend.map((r) => r.revenue))

  const seedCoa = async () => {
    const existing = accounts || []
    for (const acc of DEFAULT_COA) {
      if (!existing.some((a) => a.code === acc.code)) await db.add(STORES.accounts, { ...acc, system: true })
    }
    await refresh()
    toast('Chart of accounts seeded', 'success')
  }

  const addBank = async (e) => {
    e.preventDefault()
    await db.add(STORES.bankTxns, {
      ...bankForm,
      amount: Number(bankForm.amount) || 0,
      reconciled: false,
    })
    setBankForm({ ...bankForm, description: '', amount: '', reference: '' })
    await refresh()
    toast('Bank line added', 'success')
  }

  const reconcile = async (t) => {
    await db.put(STORES.bankTxns, { ...t, reconciled: true, reconciledAt: new Date().toISOString() })
    await refresh()
  }

  const addJournal = async (e) => {
    e?.preventDefault?.()
    const amt = Number(jForm.amount) || 0
    if (!(amt > 0)) return toast('Enter an amount', 'error')
    await db.add(STORES.journal, {
      date: jForm.date,
      memo: jForm.memo || 'Manual entry',
      debitCode: jForm.debitCode,
      creditCode: jForm.creditCode,
      debit: amt,
      credit: amt,
      amount: amt,
    })
    setJForm({ ...jForm, memo: '', amount: '' })
    await refresh()
    toast('Journal posted', 'success')
  }

  const applyTemplate = (tpl) => {
    setJForm((f) => ({
      ...f,
      debitCode: tpl.debitCode,
      creditCode: tpl.creditCode,
      memo: tpl.memo,
    }))
    setTab('journal')
    toast(`Template: ${tpl.label}`, 'info')
  }

  const autoPost = async () => {
    setBusy(true)
    try {
      const existing = new Set((journal || []).filter((j) => j.autoPost && j.sourceKey).map((j) => j.sourceKey))
      let n = 0
      for (const inv of invoices || []) {
        if (!inP(inv.date) || inv.status === 'cancelled' || inv.isCredit) continue
        const key = 'inv-' + inv.id
        if (existing.has(key)) continue
        const amt = Number(inv.total) || 0
        if (!(amt > 0)) continue
        await db.add(STORES.journal, {
          date: String(inv.date || '').slice(0, 10),
          memo: 'Auto: invoice ' + (inv.number || inv.id),
          debitCode: '1100',
          creditCode: '4000',
          debit: amt,
          credit: amt,
          amount: amt,
          autoPost: true,
          sourceKey: key,
          invoiceId: inv.id,
        })
        n++
      }
      for (const p of payments || []) {
        if (!inP(p.date)) continue
        const key = 'pay-' + p.id
        if (existing.has(key)) continue
        const amt = Number(p.amount) || 0
        if (!(amt > 0)) continue
        const inv = (invoices || []).find((i) => String(i.id) === String(p.invoiceId))
        await db.add(STORES.journal, {
          date: String(p.date || '').slice(0, 10),
          memo: `Auto: payment ${p.method || ''}${inv?.number ? ` · ${inv.number}` : ''}`.trim(),
          debitCode: '1000',
          creditCode: '1100',
          debit: amt,
          credit: amt,
          amount: amt,
          autoPost: true,
          sourceKey: key,
          paymentId: p.id,
          invoiceId: p.invoiceId,
        })
        n++
      }
      for (const ex of expenses || []) {
        if (!inP(ex.date)) continue
        const key = 'exp-' + ex.id
        if (existing.has(key)) continue
        const amt = Number(ex.amount) || 0
        if (!(amt > 0)) continue
        await db.add(STORES.journal, {
          date: (ex.date || '').slice(0, 10),
          memo: 'Auto: ' + (ex.description || ex.id),
          debitCode: ex.accountCode || '6900',
          creditCode: '1000',
          debit: amt,
          credit: amt,
          amount: amt,
          autoPost: true,
          sourceKey: key,
        })
        n++
      }
      await refresh()
      toast(n ? `Posted ${n} journal(s)` : 'Nothing new to post', n ? 'success' : 'info')
    } finally {
      setBusy(false)
    }
  }

  const exportTb = () => {
    downloadCsv(`trial-balance-${period || 'all'}.csv`, ['Code', 'Name', 'Debit', 'Credit'], (tb.rows || []).map((r) => [r.code, r.name, r.debit, r.credit]))
    toast('Trial balance CSV exported', 'success')
  }
  const exportPl = () => {
    const rows = [
      ...pl.income.map((r) => ['Income', r.code, r.name, r.net]),
      ...pl.expense.map((r) => ['Expense', r.code, r.name, r.net]),
      ['Total', '', 'Net profit', pl.netProfit],
    ]
    downloadCsv(`pnl-${period || 'all'}.csv`, ['Section', 'Code', 'Name', 'Amount'], rows)
    toast('P&L CSV exported', 'success')
  }
  const exportVat = () => {
    downloadCsv(`vat201-estimate-${period || 'all'}.csv`, ['Field', 'Amount'], [
      ['Standard sales (ex VAT)', vat.standardSales],
      ['Zero-rated sales', vat.zeroRated],
      ['Output VAT', vat.output],
      ['Input VAT', vat.input],
      ['Net VAT', vat.net],
      ['Payable', vat.payable],
      ['Refundable', vat.refundable],
    ])
    toast('VAT estimate CSV exported', 'success')
  }
  const exportAging = () => {
    downloadCsv('ar-aging.csv', ['Number', 'Client', 'Due', 'Days', 'Bucket', 'Amount'],
      aging.rows.map((r) => [r.number || r.id, r.clientName || r.clientId, r.dueDate || r.date, r.days, r.bucket, r.due]))
    toast('AR aging CSV exported', 'success')
  }
  const exportJournal = () => {
    downloadCsv(`journal-${period || 'all'}.csv`, ['Date', 'Memo', 'Debit', 'Credit', 'Amount'],
      jFiltered.map((j) => [j.date, j.memo, j.debitCode, j.creditCode, j.amount || j.debit || j.credit]))
    toast('Journal CSV exported', 'success')
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'pnl', label: 'P&L' },
    { id: 'balance', label: 'Balance sheet' },
    { id: 'compare', label: 'Compare' },
    { id: 'vat', label: 'VAT201' },
    { id: 'aging', label: 'AR aging' },
    { id: 'cash', label: 'Cash & bank' },
    { id: 'journal', label: 'Journal' },
    { id: 'coa', label: 'CoA' },
    { id: 'monthend', label: 'Month-end' },
    { id: 'health', label: 'Books health' },
  ]

  return (
    <PageFade>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Accounting</h1>
          <p className="subtitle">Owner books · {periodLabel(period)} · CoA · journals · bank · VAT · aging</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label className="muted" style={{ fontSize: 12 }}>Period</label>
          <input className="input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 160 }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPeriod('')}>All time</button>
          <LoadingButton loading={busy} className="btn btn-primary btn-sm" onClick={autoPost}>Auto-post ops</LoadingButton>
          <button type="button" className="btn btn-outline btn-sm" onClick={seedCoa}>Seed CoA</button>
        </div>
      </div>

      <div className="settings-tabs-scroll" role="tablist" style={{ marginBottom: 12 }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`settings-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
            <StatCard label="Paid revenue (period)" value={formatMoney(rev)} />
            <StatCard label="Open AR" value={formatMoney(ar)} />
            <StatCard label="Expenses (period)" value={formatMoney(exp)} />
            <StatCard label="Net (cash view)" value={formatMoney(rev - exp)} />
            <StatCard label="P&amp;L net (ledger)" value={formatMoney(pl.netProfit)} />
            <StatCard label="Books health" value={`${health.score}%`} />
            <StatCard label="Unreconciled bank" value={String(unrec.length)} />
            <StatCard label="Journal entries" value={String((journal || []).length)} />
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>Revenue trend (6 months)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, paddingTop: 8 }}>
              {revTrend.map((r) => (
                <div key={r.period} style={{ flex: 1, textAlign: 'center' }}>
                  <div title={formatMoney(r.revenue)} style={{ height: Math.max(4, (r.revenue / maxRev) * 90), background: 'linear-gradient(180deg,#10b981,#047857)', borderRadius: '6px 6px 2px 2px', margin: '0 auto', maxWidth: 40 }} />
                  <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{r.period.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginTop: 12 }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Top expenses ({periodLabel(period)})</h3>
              {!topExp.length && <p className="muted">No expenses in period.</p>}
              {topExp.map((r) => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{r.name}</span>
                  <strong style={{ fontSize: 13 }}>{formatMoney(r.total)}</strong>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Owner shortcuts</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link className="btn btn-outline btn-sm" to="/invoices">Invoices</Link>
                <Link className="btn btn-outline btn-sm" to="/payments">Payments</Link>
                <Link className="btn btn-outline btn-sm" to="/expenses">Expenses</Link>
                <Link className="btn btn-outline btn-sm" to="/bank">Bank import</Link>
                <Link className="btn btn-outline btn-sm" to="/payroll">Payroll / EMP201</Link>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('vat')}>VAT201 pack</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('aging')}>Chase debtors</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('compare')}>Compare periods</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setTab('monthend')}>Month-end</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'pnl' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0 }}>Profit &amp; loss · {periodLabel(period)}</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportPl}>Export P&amp;L CSV</button>
          </div>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatCard label="Income" value={formatMoney(pl.totalIncome)} />
            <StatCard label="Expenses" value={formatMoney(pl.totalExpense)} />
            <StatCard label="Net profit" value={formatMoney(pl.netProfit)} />
            <StatCard label="Margin %" value={`${pl.grossMarginPct.toFixed(1)}%`} />
          </div>
          <h4>Income</h4>
          {!pl.income.length && <p className="muted">No income lines — auto-post invoices or journal revenue.</p>}
          {pl.income.map((r) => (
            <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{r.code} · {r.name}</span>
              <strong>{formatMoney(r.net)}</strong>
            </div>
          ))}
          <h4 style={{ marginTop: 16 }}>Expenses</h4>
          {!pl.expense.length && <p className="muted">No expense lines in ledger for this period.</p>}
          {pl.expense.map((r) => (
            <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{r.code} · {r.name}</span>
              <strong>{formatMoney(r.net)}</strong>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '2px solid var(--border)' }}>
            <strong>Net profit / (loss)</strong>
            <strong style={{ color: pl.netProfit >= 0 ? 'var(--green, #08794e)' : '#b91c1c' }}>{formatMoney(pl.netProfit)}</strong>
          </div>
        </div>
      )}

      {tab === 'balance' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Balance sheet (all posted journals)</h3>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatCard label="Assets" value={formatMoney(bs.totalAssets)} />
            <StatCard label="Liabilities" value={formatMoney(bs.totalLiab)} />
            <StatCard label="Equity" value={formatMoney(bs.totalEquity)} />
            <StatCard label="Balanced" value={bs.balanced ? 'Yes' : 'Check'} />
          </div>
          {[['Assets', bs.assets], ['Liabilities', bs.liabilities], ['Equity', bs.equity]].map(([title, rows]) => (
            <div key={title} style={{ marginBottom: 16 }}>
              <h4>{title}</h4>
              {!rows.length && <p className="muted">None</p>}
              {rows.map((r) => (
                <div key={r.code + r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{r.code} · {r.name}</span>
                  <strong>{formatMoney(r.net)}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'compare' && (
        <AccountingComparePanel invoices={invoices} expenses={expenses} payments={payments} journal={journal} period={period} />
      )}

      {tab === 'vat' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0 }}>VAT201 estimate · {periodLabel(period)}</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportVat}>Export VAT CSV</button>
          </div>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
            <StatCard label="Standard sales" value={formatMoney(vat.standardSales)} />
            <StatCard label="Zero-rated" value={formatMoney(vat.zeroRated)} />
            <StatCard label="Output VAT" value={formatMoney(vat.output)} />
            <StatCard label="Input VAT" value={formatMoney(vat.input)} />
            <StatCard label="Net VAT" value={formatMoney(vat.net)} />
            <StatCard label="Payable" value={formatMoney(vat.payable)} />
          </div>
        </div>
      )}

      {tab === 'aging' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0 }}>Accounts receivable aging</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportAging}>Export AR CSV</button>
          </div>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatCard label="Current" value={formatMoney(aging.buckets.current)} />
            <StatCard label="1–30d" value={formatMoney(aging.buckets.d30)} />
            <StatCard label="31–60d" value={formatMoney(aging.buckets.d60)} />
            <StatCard label="61–90d" value={formatMoney(aging.buckets.d90)} />
            <StatCard label="90d+" value={formatMoney(aging.buckets.older)} />
            <StatCard label="Total AR" value={formatMoney(aging.total)} />
          </div>
          {aging.rows.slice(0, 40).map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div><strong>{r.number || r.id}</strong><span className="muted"> · {r.clientName || 'Client'} · {r.days}d</span></div>
              <strong>{formatMoney(r.due)}</strong>
            </div>
          ))}
          <h4 style={{ marginTop: 20 }}>Supplier payables</h4>
          <p className="muted" style={{ fontSize: 13 }}>Total AP: {formatMoney(ap.total)}</p>
        </div>
      )}

      {tab === 'cash' && (
        <>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 12 }}>
            <StatCard label="Bank lines net" value={formatMoney(cash.bankStatementNet)} />
            <StatCard label="Ledger cash (1000)" value={formatMoney(cash.ledgerCash)} />
            <StatCard label="Variance" value={formatMoney(cash.variance)} />
            <StatCard label="Unreconciled" value={`${cash.unreconciledCount}`} />
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add bank line</h3>
            <form className="form-grid" onSubmit={addBank} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
              <input className="input" type="date" value={bankForm.date} onChange={(e) => setBankForm({ ...bankForm, date: e.target.value })} required />
              <input className="input" placeholder="Description" value={bankForm.description} onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })} required />
              <input className="input" type="number" step="0.01" placeholder="Amount" value={bankForm.amount} onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })} required />
              <button className="btn btn-primary" type="submit">Add</button>
            </form>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Unreconciled</h3>
            {!unrec.length && <EmptyState title="All reconciled" hint="Import more from Bank." />}
            {unrec.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div><strong>{formatDateZA(t.date)}</strong><span className="muted"> · {t.description}</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong>{formatMoney(t.amount)}</strong>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => reconcile(t)}>Reconcile</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'journal' && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Post journal</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {JOURNAL_TEMPLATES.map((tpl) => (
                <button key={tpl.id} type="button" className="btn btn-outline btn-sm" onClick={() => applyTemplate(tpl)}>{tpl.label}</button>
              ))}
            </div>
            <form className="form-grid" onSubmit={addJournal} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))' }}>
              <input className="input" type="date" value={jForm.date} onChange={(e) => setJForm({ ...jForm, date: e.target.value })} required />
              <input className="input" placeholder="Memo" value={jForm.memo} onChange={(e) => setJForm({ ...jForm, memo: e.target.value })} />
              <input className="input" placeholder="Debit" value={jForm.debitCode} onChange={(e) => setJForm({ ...jForm, debitCode: e.target.value })} />
              <input className="input" placeholder="Credit" value={jForm.creditCode} onChange={(e) => setJForm({ ...jForm, creditCode: e.target.value })} />
              <input className="input" type="number" step="0.01" placeholder="Amount" value={jForm.amount} onChange={(e) => setJForm({ ...jForm, amount: e.target.value })} required />
              <button className="btn btn-primary" type="submit">Post</button>
            </form>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ marginTop: 0 }}>Journal</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={exportJournal}>Export</button>
            </div>
            {jFiltered.slice().reverse().slice(0, 60).map((j) => (
              <div key={j.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{formatDateZA(j.date)} · {j.memo || 'Entry'}</strong>
                  <strong>{formatMoney(j.amount || j.debit || j.credit)}</strong>
                </div>
                <span className="muted">Dr {j.debitCode} · Cr {j.creditCode}</span>
              </div>
            ))}
            <h4 style={{ marginTop: 16 }}>Trial balance · Δ {formatMoney(tbDelta)}</h4>
            <button type="button" className="btn btn-outline btn-sm" onClick={exportTb}>Export TB</button>
            {(tb.rows || []).map((r) => (
              <div key={r.code} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 90px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span>{r.code}</span><span>{r.name}</span>
                <span style={{ textAlign: 'right' }}>{r.debit ? formatMoney(r.debit) : '—'}</span>
                <span style={{ textAlign: 'right' }}>{r.credit ? formatMoney(r.credit) : '—'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'coa' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0 }}>Chart of accounts</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={seedCoa}>Seed SA CoA</button>
          </div>
          {[...(accounts || [])].sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })).map((a) => (
            <div key={a.id || a.code} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 100px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <strong>{a.code}</strong><span>{a.name}</span><span className="muted">{a.type}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'monthend' && (
        <AccountingMonthEndPanel
          invoices={invoices}
          expenses={expenses}
          journal={journal}
          bankTxns={bankTxns}
          payments={payments}
          accounts={accounts}
          period={period}
          busy={busy}
          onAutoPost={autoPost}
          onGoCash={() => setTab('cash')}
          onGoAging={() => setTab('aging')}
          onExportVat={exportVat}
          onExportPl={exportPl}
          onExportTb={exportTb}
        />
      )}

      {tab === 'health' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Books health · {health.score}%</h3>
          {health.checks.map((c) => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ color: c.ok ? 'var(--green, #08794e)' : '#b91c1c' }}>{c.ok ? '✓' : '!'} {c.label}</strong>
              <div className="muted" style={{ fontSize: 12 }}>{c.detail}</div>
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <LoadingButton loading={busy} className="btn btn-primary" onClick={autoPost}>Auto-post missing ops</LoadingButton>
            <button type="button" className="btn btn-outline" onClick={seedCoa}>Seed CoA</button>
          </div>
        </div>
      )}
    </PageFade>
  )
}
