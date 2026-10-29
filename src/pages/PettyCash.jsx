import React, { useEffect, useMemo, useState } from 'react'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { EmptyState, PageFade, StatCard, formatDateZA, downloadCsv } from '../components/ui'

const categories = [
  ['6900', 'General & admin'], ['6300', 'Fuel & travel'], ['6400', 'Utilities & communications'],
  ['6700', 'Bank charges'], ['5000', 'Stock & materials'], ['6200', 'Rent & premises'], ['6100', 'Staff costs'],
]
const blank = () => ({ type: 'expense', date: new Date().toISOString().slice(0, 10), amount: '', description: '', vendor: '', category: '6900', reference: '' })

export default function PettyCash() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(blank())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => setRows((await db.getAll(STORES.pettyCash)).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt))))
  useEffect(() => { load().catch((e) => setError(e.message || 'Could not load petty cash')) }, [])
  const totals = useMemo(() => {
    const inTotal = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + Number(r.amount || 0), 0)
    const outTotal = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + Number(r.amount || 0), 0)
    return { inTotal, outTotal, balance: Math.round((inTotal - outTotal) * 100) / 100 }
  }, [rows])
  const save = async (event) => {
    event.preventDefault()
    setError('')
    const amount = Math.round(Number(form.amount) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (!form.description.trim()) return setError('Description is required.')
    if (form.type === 'expense' && amount - totals.balance > 0.009) return setError('This expense exceeds the available petty-cash balance. Record a float top-up first.')
    setBusy(true)
    try {
      const isExpense = form.type === 'expense'
      const accountCode = isExpense ? form.category : '1010'
      const movement = {
        type: form.type, direction: isExpense ? 'out' : 'in', date: form.date, amount,
        description: form.description.trim(), vendor: form.vendor.trim(), reference: form.reference.trim(),
        accountCode, paymentMethod: 'Petty cash', balanceAfter: Math.round((totals.balance + (isExpense ? -amount : amount)) * 100) / 100,
      }
      const journal = isExpense ? {
        date: form.date, memo: 'Petty cash expense · ' + form.description.trim(),
        debitCode: accountCode, creditCode: '1010', debit: amount, credit: amount, amount,
        autoPost: true, sourceKey: 'petty-cash-' + crypto.randomUUID(),
      } : {
        date: form.date, memo: 'Petty cash float top-up · ' + form.description.trim(),
        debitCode: '1010', creditCode: '1000', debit: amount, credit: amount, amount,
        autoPost: true, sourceKey: 'petty-cash-' + crypto.randomUUID(),
      }
      const operations = [
        { store: STORES.pettyCash, type: 'add', value: movement },
        { store: STORES.journal, type: 'add', value: journal },
      ]
      if (isExpense) operations.push({ store: STORES.expenses, type: 'add', value: {
        date: form.date, description: form.description.trim(), amount, category: categories.find((c) => c[0] === accountCode)?.[1] || 'Other',
        vendor: form.vendor.trim(), accountCode, source: 'petty-cash',
      } })
      await db.addManyAtomic(operations)
      setForm(blank())
      await load()
    } catch (e) {
      setError(e.message || 'Could not save petty-cash entry')
    } finally { setBusy(false) }
  }
  const exportRows = () => downloadCsv('petty-cash-' + new Date().toISOString().slice(0, 10) + '.csv',
    ['Date', 'Type', 'Description', 'Vendor', 'Reference', 'Money in', 'Money out', 'Balance after'],
    rows.map((r) => [r.date, r.type, r.description, r.vendor, r.reference, r.direction === 'in' ? r.amount : 0, r.direction === 'out' ? r.amount : 0, r.balanceAfter]))
  return <PageFade>
    <div className="page-header"><div><h1>Petty cash</h1><p className="subtitle">Track cash float, top-ups and small business expenses with a balanced cashbook.</p></div><button type="button" className="btn btn-outline" onClick={exportRows} disabled={!rows.length}>Export CSV</button></div>
    <div className="grid-stats" style={{ marginBottom: 16 }}>
      <StatCard label="Cash available" value={formatMoney(totals.balance)} tone={totals.balance >= 0 ? 'good' : 'warn'} />
      <StatCard label="Float received" value={formatMoney(totals.inTotal)} />
      <StatCard label="Cash spent" value={formatMoney(totals.outTotal)} />
      <StatCard label="Entries" value={rows.length} />
    </div>
    <form className="card form-grid cols-3" onSubmit={save} style={{ marginBottom: 16 }}>
      <div style={{ gridColumn: '1 / -1' }}><strong>Record petty-cash movement</strong></div>
      <div><label className="label">Entry type</label><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Cash expense</option><option value="topup">Float top-up / cash received</option></select></div>
      <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
      <div><label className="label">Amount (ZAR)</label><input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></div>
      <div style={{ gridColumn: '1 / -1' }}><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={form.type === 'expense' ? 'e.g. Parking, stationery, cleaning supplies' : 'e.g. Initial float / replenishment'} required /></div>
      {form.type === 'expense' ? <><div><label className="label">Expense category</label><select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div><div><label className="label">Supplier / paid to</label><input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div></> : <div><label className="label">Source / received from</label><input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Bank withdrawal / owner float" /></div>}
      <div><label className="label">Slip / reference</label><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
      <div style={{ display: 'flex', alignItems: 'end' }}><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : form.type === 'expense' ? 'Record cash expense' : 'Record float top-up'}</button></div>
      {error ? <p role="alert" style={{ color: 'var(--danger, #dc2626)', gridColumn: '1 / -1', margin: 0 }}>{error}</p> : null}
    </form>
    <h3>Petty-cash register</h3>
    {!rows.length ? <EmptyState title="No petty-cash entries yet" hint="Record your opening float as a top-up, then log each cash expense with its slip or reference." /> : <div className="card" style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%' }}><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Reference</th><th>Money in</th><th>Money out</th><th>Balance after</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{formatDateZA(r.date)}</td><td><strong>{r.description}</strong>{r.vendor ? <div className="muted">{r.vendor}</div> : null}</td><td>{r.type === 'topup' ? 'Float top-up' : 'Cash expense'}</td><td>{r.reference || '—'}</td><td>{r.direction === 'in' ? formatMoney(r.amount) : '—'}</td><td>{r.direction === 'out' ? formatMoney(r.amount) : '—'}</td><td>{formatMoney(r.balanceAfter)}</td></tr>)}</tbody></table></div>}
  </PageFade>
}
