import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState } from '../components/ui'
import {
  listRecurring, upsertRecurring, removeRecurring, runDueRecurring, nextRunDate,
} from '../lib/recurring'
import { formatMoney } from '../lib/money'

export default function Recurring() {
  const { clients, invoices, toast, refresh } = useApp()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({
    clientId: '',
    description: 'Monthly retainer',
    amount: '',
    cadence: 'monthly',
    dayOfMonth: 1,
  })
  const [busy, setBusy] = useState(false)

  const reload = async () => setRows(await listRecurring())
  useEffect(() => { reload() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.clientId) return toast?.('Pick a client', 'error')
    const amount = Number(form.amount)
    if (!(amount > 0)) return toast?.('Amount required', 'error')
    await upsertRecurring({
      clientId: form.clientId,
      amount,
      description: form.description,
      cadence: form.cadence,
      dayOfMonth: Number(form.dayOfMonth) || 1,
      nextRun: nextRunDate(form.cadence, Number(form.dayOfMonth) || 1),
      lines: [{ description: form.description || 'Retainer', qty: 1, price: amount }],
    })
    setForm((f) => ({ ...f, amount: '', description: 'Monthly retainer' }))
    await reload()
    toast?.('Recurring template saved', 'success')
  }

  const runNow = async () => {
    setBusy(true)
    try {
      const created = await runDueRecurring({ invoices })
      await reload()
      await refresh?.()
      toast?.(created?.length ? `Created ${created.length} draft invoice(s)` : 'Nothing due today', 'success')
    } catch (e) {
      toast?.(e.message || 'Run failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Recurring invoices</h1>
          <p className="subtitle">Retainers &amp; scheduled drafts — run due templates anytime</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={runNow}>
          Run due now
        </button>
      </div>

      <form className="card form-grid" onSubmit={save} style={{ marginBottom: 16 }}>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Client</span>
          <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">— Select —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Description</span>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Amount (R)</span>
          <input className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Cadence</span>
          <select className="input" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Day of month</span>
          <input className="input" type="number" min={1} max={28} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primary">Add template</button>
      </form>

      {!rows.length ? (
        <EmptyState title="No recurring templates" hint="Add a monthly retainer or support contract." />
      ) : (
        rows.map((r) => {
          const c = clients.find((x) => String(x.id) === String(r.clientId))
          const amt = (r.lines || []).reduce((s, l) => s + (Number(l.qty) || 1) * (Number(l.price) || 0), 0)
          return (
            <div key={r.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <strong>{c?.name || 'Client'}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {r.cadence} · next {r.nextRun || '—'} · {formatMoney(amt)}
                  {r.active === false ? ' · paused' : ''}
                </div>
                <div style={{ fontSize: 13 }}>{(r.lines || [])[0]?.description || r.notes}</div>
              </div>
              <div className="list-card-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
                  await upsertRecurring({ ...r, active: r.active === false })
                  await reload()
                  toast?.(r.active === false ? 'Resumed' : 'Paused', 'success')
                }}>{r.active === false ? 'Resume' : 'Pause'}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
                  await removeRecurring(r.id)
                  await reload()
                  toast?.('Removed', 'success')
                }}>Delete</button>
              </div>
            </div>
          )
        })
      )}
    </PageFade>
  )
}
