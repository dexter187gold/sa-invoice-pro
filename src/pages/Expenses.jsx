
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'

export default function Expenses() {
  const { expenses, refresh, toast } = useApp()
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    category: 'General',
    accountCode: '6900',
    vendor: '',
  })

  const save = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return toast('Description required', 'error')
    await db.add(STORES.expenses, {
      ...form,
      amount: Number(form.amount) || 0,
      description: form.description.trim(),
    })
    setForm({ ...form, description: '', amount: '', vendor: '' })
    await refresh()
    toast('Expense saved', 'success')
  }

  const del = async (id) => {
    if (!confirm('Delete expense?')) return
    await db.remove(STORES.expenses, id)
    await refresh()
  }

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="subtitle">Total {formatMoney(total)}</p>
        </div>
      </div>
      <form className="card form-grid cols-3" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <input className="input" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input" placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <input className="input" placeholder="Account code" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} />
        <button className="btn btn-primary" type="submit">Add expense</button>
      </form>
      {expenses.map((e) => (
        <div key={e.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{e.description}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{(e.date || '').slice(0, 10)} · {e.category} · {formatMoney(e.amount)}</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => del(e.id)}>Del</button>
        </div>
      ))}
      {!expenses.length && <div className="card empty">No expenses.</div>}
    </div>
  )
}
