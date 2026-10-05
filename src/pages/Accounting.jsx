
import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { DEFAULT_COA, buildTrialBalance } from '../lib/accounting'

export default function Accounting() {
  const { invoices, expenses, journal, accounts, bankTxns, refresh, toast } = useApp()
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState('')
  const [bankForm, setBankForm] = useState({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', reference: '' })
  const [jForm, setJForm] = useState({ date: new Date().toISOString().slice(0, 10), memo: '', debitCode: '1000', creditCode: '4000', amount: '' })

  const inP = (d) => !period || String(d || '').startsWith(period)
  const paid = invoices.filter((i) => i.status === 'paid' && !i.isCredit && inP(i.date))
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const exp = expenses.filter((e) => inP(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const unrec = (bankTxns || []).filter((t) => !t.reconciled)
  const jFiltered = (journal || []).filter((j) => inP(j.date))
  const tb = useMemo(() => buildTrialBalance(jFiltered, accounts), [jFiltered, accounts])

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

  const recon = async (id) => {
    const t = bankTxns.find((x) => x.id === id)
    if (!t) return
    await db.put(STORES.bankTxns, { ...t, reconciled: true, reconciledAt: new Date().toISOString() })
    await refresh()
  }

  const addJournal = async (e) => {
    e.preventDefault()
    const amt = Number(jForm.amount) || 0
    if (!(amt > 0)) return toast('Amount required', 'error')
    await db.add(STORES.journal, {
      date: jForm.date,
      memo: jForm.memo,
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

  const autoPost = async () => {
    await seedCoa()
    let n = 0
    const existing = new Set((journal || []).filter((j) => j.autoPost && j.sourceKey).map((j) => j.sourceKey))
    for (const inv of invoices) {
      if (inv.status !== 'paid' || inv.isCredit) continue
      if (!inP(inv.date)) continue
      const key = 'inv-paid-' + inv.id
      if (existing.has(key)) continue
      const amt = Number(inv.total) || 0
      if (!(amt > 0)) continue
      await db.add(STORES.journal, {
        date: (inv.paidDate || inv.date || '').slice(0, 10),
        memo: 'Auto: paid ' + (inv.number || inv.id),
        debitCode: '1000',
        creditCode: '4000',
        debit: amt,
        credit: amt,
        amount: amt,
        autoPost: true,
        sourceKey: key,
      })
      n++
    }
    for (const ex of expenses) {
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
  }

  const tabs = [
    ['overview', 'Overview'],
    ['bank', 'Bank recon'],
    ['coa', 'Chart of accounts'],
    ['journal', 'Journal'],
    ['reports', 'TB / P&L'],
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Accounting</h1>
          <p className="subtitle">Bookkeeping hub · CoA · journals · bank · TB</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 120 }} placeholder="YYYY-MM" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={autoPost}>Auto-post ops</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={seedCoa}>Seed CoA</button>
        </div>
      </div>
      <div className="tabs-row">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-stats">
          <div className="card stat"><div className="label">Paid revenue</div><div className="value">{formatMoney(rev)}</div></div>
          <div className="card stat"><div className="label">Outstanding AR</div><div className="value">{formatMoney(ar)}</div></div>
          <div className="card stat"><div className="label">Expenses</div><div className="value">{formatMoney(exp)}</div></div>
          <div className="card stat"><div className="label">Net</div><div className="value">{formatMoney(rev - exp)}</div></div>
          <div className="card stat"><div className="label">Unreconciled</div><div className="value">{unrec.length}</div></div>
          <div className="card stat"><div className="label">TB Δ</div><div className="value">{formatMoney(Math.abs(tb.totalDr - tb.totalCr))}</div></div>
        </div>
      )}

      {tab === 'bank' && (
        <>
          <form className="card form-grid cols-3" onSubmit={addBank} style={{ marginBottom: '1rem' }}>
            <input className="input" type="date" value={bankForm.date} onChange={(e) => setBankForm({ ...bankForm, date: e.target.value })} />
            <input className="input" placeholder="Description" value={bankForm.description} onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })} required />
            <input className="input" type="number" step="0.01" placeholder="Amount (+in / -out)" value={bankForm.amount} onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })} required />
            <input className="input" placeholder="Reference" value={bankForm.reference} onChange={(e) => setBankForm({ ...bankForm, reference: e.target.value })} />
            <button className="btn btn-primary" type="submit">Add bank line</button>
          </form>
          {(bankTxns || []).map((t) => (
            <div key={t.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <strong>{formatMoney(t.amount)}</strong> · {t.description}
                <div className="muted" style={{ fontSize: 13 }}>{(t.date || '').slice(0, 10)} · {t.reconciled ? 'Reconciled' : 'Open'}</div>
              </div>
              {!t.reconciled && <button type="button" className="btn btn-outline btn-sm" onClick={() => recon(t.id)}>Reconcile</button>}
            </div>
          ))}
        </>
      )}

      {tab === 'coa' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead>
            <tbody>
              {[...(accounts || [])].sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })).map((a) => (
                <tr key={a.id || a.code}><td>{a.code}</td><td>{a.name}</td><td><span className="badge">{a.type}</span></td></tr>
              ))}
            </tbody>
          </table>
          {!accounts?.length && <p className="muted">No accounts — click Seed CoA.</p>}
        </div>
      )}

      {tab === 'journal' && (
        <>
          <form className="card form-grid cols-3" onSubmit={addJournal} style={{ marginBottom: '1rem' }}>
            <input className="input" type="date" value={jForm.date} onChange={(e) => setJForm({ ...jForm, date: e.target.value })} />
            <input className="input" placeholder="Memo" value={jForm.memo} onChange={(e) => setJForm({ ...jForm, memo: e.target.value })} />
            <input className="input" placeholder="Debit code" value={jForm.debitCode} onChange={(e) => setJForm({ ...jForm, debitCode: e.target.value })} />
            <input className="input" placeholder="Credit code" value={jForm.creditCode} onChange={(e) => setJForm({ ...jForm, creditCode: e.target.value })} />
            <input className="input" type="number" step="0.01" placeholder="Amount" value={jForm.amount} onChange={(e) => setJForm({ ...jForm, amount: e.target.value })} />
            <button className="btn btn-primary" type="submit">Post</button>
          </form>
          {(journal || []).slice().reverse().map((j) => (
            <div key={j.id} className="list-card">
              {(j.date || '').slice(0, 10)} · {j.memo || 'Journal'} · Dr {j.debitCode} / Cr {j.creditCode} · {formatMoney(j.amount || j.debit)}
              {j.autoPost ? ' · auto' : ''}
            </div>
          ))}
        </>
      )}

      {tab === 'reports' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Trial balance</h3>
          <table className="table">
            <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>
              {tb.rows.map((r) => (
                <tr key={r.code}><td>{r.code} {r.name}</td><td>{r.debit ? formatMoney(r.debit) : ''}</td><td>{r.credit ? formatMoney(r.credit) : ''}</td></tr>
              ))}
              <tr><td><strong>Totals</strong></td><td><strong>{formatMoney(tb.totalDr)}</strong></td><td><strong>{formatMoney(tb.totalCr)}</strong></td></tr>
            </tbody>
          </table>
          <p className="muted">P&amp;L lite: Revenue {formatMoney(rev)} − Expenses {formatMoney(exp)} = <strong>{formatMoney(rev - exp)}</strong></p>
        </div>
      )}
    </div>
  )
}
