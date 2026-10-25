import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState } from '../components/ui'
import { listSeats, upsertSeat, removeSeat, setActiveSeatId, getActiveSeatId, ROLES } from '../lib/seats'
import { computeUsage } from '../lib/usageMetrics'

export default function Team() {
  const { toast, invoices, clients, tickets, payments } = useApp()
  const [seats, setSeats] = useState([])
  const [active, setActive] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'tech', pin: '' })

  const reload = async () => {
    setSeats(await listSeats())
    setActive((await getActiveSeatId()) || '')
  }
  useEffect(() => { reload() }, [])

  const usage = computeUsage({ invoices, clients, tickets, payments, seats })

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    await upsertSeat(form)
    setForm({ name: '', email: '', role: 'tech', pin: '' })
    await reload()
    toast('Seat saved', 'success')
  }

  const switchSeat = async (id) => {
    await setActiveSeatId(id)
    setActive(id)
    toast('Active seat switched', 'success')
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Team & seats</h1>
          <p className="subtitle">
            Roles · {seats.filter((s) => s.active !== false).length} active · suggested tier: {usage.suggestedTier}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong>Usage this month ({usage.month})</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginTop: 8, fontSize: 13 }}>
          <div>Invoices <strong>{usage.invoicesThisMonth}</strong></div>
          <div>Payments <strong>{usage.paymentsThisMonth}</strong></div>
          <div>Clients <strong>{usage.clientsTotal}</strong></div>
          <div>Open jobs <strong>{usage.openJobs}</strong></div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Solo ≤1 seat · Shop ≤5 · Multi ≤25 — see License tiers.
        </p>
      </div>

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Optional PIN</label>
          <input className="input" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} maxLength={8} />
        </div>
        <button type="submit" className="btn btn-primary">Add / update seat</button>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Roles</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {ROLES.map((r) => (
            <li key={r.id}><strong>{r.label}</strong> — {r.description}</li>
          ))}
        </ul>
      </div>

      {!seats.length ? (
        <EmptyState title="No seats yet" hint="Add technicians and front desk as seats for Shop / Multi licenses." />
      ) : (
        <div className="card">
          {seats.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border,rgba(255,255,255,.08))', flexWrap: 'wrap' }}>
              <div>
                <strong>{s.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {ROLES.find((r) => r.id === s.role)?.label || s.role}
                  {s.email ? ` · ${s.email}` : ''}
                  {active === s.id ? ' · ACTIVE' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => switchSeat(s.id)}>Switch</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ name: s.name, email: s.email || '', role: s.role, pin: s.pin || '', id: s.id })}>Edit</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={async () => { await removeSeat(s.id); await reload(); toast('Removed', 'success') }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageFade>
  )
}
