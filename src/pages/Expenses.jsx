import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, formatDateZA, StatCard, downloadCsv, FilterChips, ActionMenu,
} from '../components/ui'
import PageInsightsBar from '../components/PageInsightsBar'

const CATEGORIES = ['Stock', 'Fuel', 'Rent', 'Utilities', 'Tools', 'Marketing', 'Salaries', 'Bank fees', 'Other']

const blank = () => ({
  id: undefined,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: '',
  category: 'Other',
  vendor: '',
  accountCode: '',
})

export default function Expenses() {
  const { expenses, refresh, toast } = useApp()
  const [form, setForm] = useState(blank())
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => {
    let rows = expenses.filter((e) =>
      matchesQuery(e, q, ['description', 'vendor', 'category', 'accountCode']),
    )
    if (cat !== 'all') rows = rows.filter((e) => e.category === cat)
    return rows
  }, [expenses, q, cat])

  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthTotal = expenses
    .filter((e) => String(e.date || '').startsWith(monthKey))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0)

  const startEdit = (row) => {
    setForm({
      id: row.id,
      date: String(row.date || '').slice(0, 10) || blank().date,
      description: row.description || '',
      amount: row.amount ?? '',
      category: row.category || 'Other',
      vendor: row.vendor || '',
      accountCode: row.accountCode || '',
    })
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return toast('Description required', 'error')
    try {
      const row = {
        date: form.date,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        category: form.category || 'Other',
        vendor: form.vendor || '',
        accountCode: form.accountCode || '',
        updatedAt: new Date().toISOString(),
      }
      if (form.id) {
        await db.put(STORES.expenses, { ...row, id: form.id })
        toast('Expense updated', 'success')
      } else {
        await db.add(STORES.expenses, row)
        toast('Expense added', 'success')
      }
      setForm(blank())
      await refresh()
    } catch (err) {
      toast(err?.message || 'Save failed', 'error')
    }
  }

  const del = (row) => {
    const id = typeof row === 'object' ? row?.id : row
    setConfirm({
      title: 'Delete expense?',
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        try {
          if (id == null) throw new Error('Missing id')
          await db.remove(STORES.expenses, id)
          await refresh()
          toast('Deleted', 'success')
          if (form.id != null && String(form.id) === String(id)) setForm(blank())
        } catch (err) {
          toast(err?.message || 'Delete failed', 'error')
        } finally {
          setConfirm(null)
        }
      },
    })
  }

  const duplicate = (row) => {
    setForm({
      id: undefined,
      date: new Date().toISOString().slice(0, 10),
      description: row.description || '',
      amount: row.amount ?? '',
      category: row.category || 'Other',
      vendor: row.vendor || '',
      accountCode: row.accountCode || '',
    })
    toast('Editing a copy — save to create', 'info')
  }

  const exportCsv = () => {
    downloadCsv(
      `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Description', 'Category', 'Vendor', 'Account', 'Amount'],
      filtered.map((e) => [
        e.date || '', e.description || '', e.category || '', e.vendor || '', e.accountCode || '', Number(e.amount) || 0,
      ]),
    )
    toast('CSV exported', 'success')
  }

  const chips = [
    { id: 'all', label: 'All', count: expenses.length },
    ...CATEGORIES.map((c) => ({
      id: c,
      label: c,
      count: expenses.filter((e) => e.category === c).length,
    })).filter((c) => c.count > 0),
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="subtitle">
            {filtered.length} shown · total {formatMoney(total)}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      <PageInsightsBar page="expenses" />

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="This month" value={formatMoney(monthTotal)} />
        <StatCard label="Filtered total" value={formatMoney(total)} />
        <StatCard label="Records" value={filtered.length} />
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search description, vendor, category…" />
      </div>
      <FilterChips options={chips} value={cat} onChange={setCat} />

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>{form.id ? 'Edit expense' : 'Add expense'}</strong>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="label">Amount (ZAR)</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Description *</label>
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <button className="btn btn-primary" type="submit">{form.id ? 'Update expense' : 'Add expense'}</button>
          {form.id ? (
            <button type="button" className="btn btn-outline" onClick={() => setForm(blank())}>Cancel</button>
          ) : null}
        </div>
      </form>

      {!filtered.length ? (
        <EmptyState
          title={expenses.length ? 'No matches' : 'No expenses yet'}
          hint={expenses.length ? 'Try another search or category.' : 'Log business costs for reporting and net profit.'}
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
              <div className="list-card-actions" style={{ alignItems: 'center' }}>
                <strong>{formatMoney(e.amount)}</strong>
                {e.source === 'petty-cash' ? <span className="muted" style={{ fontSize: 11 }}>Controlled in petty-cash register</span> : <><button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(e)}>Edit</button><ActionMenu label="Actions" items={[{ id: 'edit', label: 'Edit', onClick: () => startEdit(e) }, { id: 'dup', label: 'Duplicate', onClick: () => duplicate(e) }, { id: 'del', label: 'Delete', danger: true, onClick: () => del(e) }]} /></>}
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
