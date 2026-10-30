import React, { useEffect, useMemo, useState } from 'react'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { EmptyState, PageFade, StatCard, formatDateZA, downloadCsv } from '../components/ui'
import Modal from '../components/Modal'
import PageInsightsBar from '../components/PageInsightsBar'

const categories = [
  ['6900', 'General & admin'], ['6300', 'Fuel & travel'], ['6400', 'Utilities & communications'],
  ['6700', 'Bank charges'], ['5000', 'Stock & materials'], ['6200', 'Rent & premises'], ['6100', 'Staff costs'],
]
const blank = () => ({
  type: 'expense',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  description: '',
  vendor: '',
  category: '6900',
  reference: '',
})

export default function PettyCash() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(blank())
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () =>
    setRows(
      (await db.getAll(STORES.pettyCash)).sort(
        (a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      ),
    )

  useEffect(() => {
    load().catch((e) => setError(e.message || 'Could not load petty cash'))
  }, [])

  const totals = useMemo(() => {
    const inTotal = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + Number(r.amount || 0), 0)
    const outTotal = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + Number(r.amount || 0), 0)
    return { inTotal, outTotal, balance: Math.round((inTotal - outTotal) * 100) / 100 }
  }, [rows])

  const openNew = (type = 'expense') => {
    setForm({ ...blank(), type })
    setError('')
    setShow(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    const amount = Math.round(Number(form.amount) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (!form.description.trim()) return setError('Description is required.')
    if (form.type === 'expense' && amount > totals.balance + 0.001) {
      return setError(`Insufficient float (balance ${formatMoney(totals.balance)}). Top up first or lower the amount.`)
    }
    setBusy(true)
    try {
      const direction = form.type === 'topup' ? 'in' : 'out'
      const prevBal = totals.balance
      const balanceAfter = direction === 'in' ? prevBal + amount : prevBal - amount
      await db.add(STORES.pettyCash, {
        ...form,
        amount,
        direction,
        balanceAfter: Math.round(balanceAfter * 100) / 100,
        description: form.description.trim(),
        createdAt: new Date().toISOString(),
      })
      setForm(blank())
      setShow(false)
      await load()
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    downloadCsv(
      `petty-cash-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Description', 'Type', 'Reference', 'In', 'Out', 'Balance after'],
      rows.map((r) => [
        r.date,
        r.description,
        r.type === 'topup' ? 'Float top-up' : 'Cash expense',
        r.reference || '',
        r.direction === 'in' ? r.amount : '',
        r.direction === 'out' ? r.amount : '',
        r.balanceAfter,
      ]),
    )
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Petty cash</h1>
          <p className="subtitle">Float top-ups and cash expenses · slip references · running balance</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!rows.length}>Export</button>
          <button type="button" className="btn btn-secondary" onClick={() => openNew('topup')}>Top-up float</button>
          <button type="button" className="btn btn-primary" onClick={() => openNew('expense')}>Cash expense</button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 12 }}>
        <StatCard label="Balance" value={formatMoney(totals.balance)} />
        <StatCard label="Money in" value={formatMoney(totals.inTotal)} />
        <StatCard label="Money out" value={formatMoney(totals.outTotal)} />
      </div>

      <PageInsightsBar page="expenses" />

      <Modal
        open={show}
        title={form.type === 'topup' ? 'Record float top-up' : 'Record cash expense'}
        onClose={() => setShow(false)}
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button>
            <button type="submit" form="petty-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : form.type === 'expense' ? 'Record expense' : 'Record top-up'}
            </button>
          </>
        )}
      >
        <form id="petty-form" className="form-grid cols-2" onSubmit={save}>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="expense">Cash expense</option>
              <option value="topup">Float top-up</option>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Amount (R)</label>
            <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Description</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={form.type === 'expense' ? 'e.g. Parking, stationery' : 'e.g. Initial float'}
              required
            />
          </div>
          {form.type === 'expense' ? (
            <>
              <div>
                <label className="label">Expense category</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Supplier / paid to</label>
                <input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </div>
            </>
          ) : (
            <div>
              <label className="label">Source / received from</label>
              <input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Bank withdrawal / owner float" />
            </div>
          )}
          <div>
            <label className="label">Slip / reference</label>
            <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          {error ? (
            <p role="alert" style={{ color: 'var(--danger, #dc2626)', gridColumn: '1 / -1', margin: 0 }}>{error}</p>
          ) : null}
        </form>
      </Modal>

      <h3>Petty-cash register</h3>
      {!rows.length ? (
        <EmptyState
          title="No petty-cash entries yet"
          hint="Record your opening float as a top-up, then log each cash expense with its slip or reference."
          action={<button type="button" className="btn btn-primary" onClick={() => openNew('topup')}>Top-up float</button>}
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Money in</th>
                <th>Money out</th>
                <th>Balance after</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateZA(r.date)}</td>
                  <td>
                    <strong>{r.description}</strong>
                    {r.vendor ? <div className="muted">{r.vendor}</div> : null}
                  </td>
                  <td>{r.type === 'topup' ? 'Float top-up' : 'Cash expense'}</td>
                  <td>{r.reference || '—'}</td>
                  <td>{r.direction === 'in' ? formatMoney(r.amount) : '—'}</td>
                  <td>{r.direction === 'out' ? formatMoney(r.amount) : '—'}</td>
                  <td>{formatMoney(r.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageFade>
  )
}
