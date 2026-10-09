import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, formatDateZA, StatCard,
} from '../components/ui'

const CATEGORIES = ['General', 'Travel', 'Office', 'Software', 'Marketing', 'Utilities', 'Salaries', 'Other']

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
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(
    () => expenses.filter((e) => matchesQuery(e, q, ['description', 'category', 'vendor', 'accountCode'])),
    [expenses, q]
  )

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const filteredTotal = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  const save = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return toast('Description required', 'error')
    const amt = Number(form.amount)
    if (!(amt > 0)) return toast('Amount must be greater than zero', 'error')
    await db.add(STORES.expenses, {
      ...form,
      amount: amt,
      description: form.description.trim(),
    })
    setForm({ ...form, description: '', amount: '', vendor: '' })
    await refresh()
    toast('Expense saved', 'success')
  }

  const del = (id) => {
    setConfirm({
      title: 'Delete expense?',
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.expenses, id)
        await refresh()
        toast('Deleted', 'success')
        setConfirm(null)
      },
    })
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="subtitle">
            {filtered.length} shown · total {formatMoney(total)}
            {q ? ` · filtered ${formatMoney(filteredTotal)}` : ''}
          </p>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="All expenses" value={formatMoney(total)} />
        <StatCard label="This view" value={formatMoney(filteredTotal)} hint={`${filtered.length} items`} />
        <StatCard label="Records" value={expenses.length} />
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search description, vendor, category…" />
      </div>

      <form className="card form-grid cols-3" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Description *</label>
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
        <div>
          <label className="label">Amount *</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Vendor</label>
          <input className="input" placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        </div>
        <div>
          <label className="label">Account code</label>
          <input className="input" placeholder="e.g. 6900" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">Add expense</button>
      </form>

      {!filtered.length ? (
        <EmptyState
          title={expenses.length ? 'No matches' : 'No expenses yet'}
          hint={expenses.length ? 'Try another search.' : 'Log business costs for reporting and net profit.'}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
          .map((e) => (
            <div key={e.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{e.description}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDateZA(e.date)} · {e.category}
                  {e.vendor ? ` · ${e.vendor}` : ''}
                  {e.accountCode ? ` · #${e.accountCode}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>{formatMoney(e.amount)}</strong>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => del(e.id)}>Delete</button>
              </div>
            </div>
          ))
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
      />
    </PageFade>
  )
}
