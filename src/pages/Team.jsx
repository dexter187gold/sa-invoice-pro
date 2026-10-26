import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState } from '../components/ui'
import {
  listSeats,
  upsertSeat,
  removeSeat,
  setActiveSeatId,
  getActiveSeatId,
  ROLES,
  assertCanAddSeat,
  seatLimits,
  verifySeatPin,
} from '../lib/seats'
import { computeUsage } from '../lib/usageMetrics'
import ActiveSeatChip from '../components/ActiveSeatChip'

export default function Team() {
  const { toast, invoices, clients, tickets, payments, company } = useApp()
  const [seats, setSeats] = useState([])
  const [active, setActive] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'tech', pin: '', id: '' })
  const [pinPrompt, setPinPrompt] = useState(null)
  const [pinInput, setPinInput] = useState('')

  const license = company?.license || {}
  const limits = seatLimits({ tier: company?.tier }, license)

  const reload = async () => {
    setSeats(await listSeats())
    setActive((await getActiveSeatId()) || '')
  }
  useEffect(() => {
    reload()
  }, [])

  const usage = computeUsage({ invoices, clients, tickets, payments, seats })
  const activeCount = seats.filter((s) => s.active !== false).length

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    try {
      await assertCanAddSeat({ tier: company?.tier }, license, { seatId: form.id || undefined })
      await upsertSeat(form)
      setForm({ name: '', email: '', role: 'tech', pin: '', id: '' })
      await reload()
      toast(form.id ? 'Seat updated' : 'Seat saved', 'success')
    } catch (err) {
      toast(err?.message || 'Could not save seat', 'error')
    }
  }

  const requestSwitch = (seat) => {
    if (seat.pin) {
      setPinPrompt(seat)
      setPinInput('')
      return
    }
    doSwitch(seat.id)
  }

  const doSwitch = async (id) => {
    await setActiveSeatId(id)
    setActive(id)
    setPinPrompt(null)
    setPinInput('')
    toast('Active seat switched — RoleGate applies on next page', 'success')
  }

  const confirmPin = () => {
    if (!pinPrompt) return
    if (!verifySeatPin(pinPrompt, pinInput)) {
      toast('Wrong PIN for this seat', 'error')
      return
    }
    doSwitch(pinPrompt.id)
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Team & seats</h1>
          <p className="subtitle">
            Roles · {activeCount} active / {limits.users} on {limits.tier} · suggested tier: {usage.suggestedTier}
          </p>
        </div>
        <ActiveSeatChip />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong>Usage this month ({usage.month})</strong>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))',
            gap: 8,
            marginTop: 8,
            fontSize: 13,
          }}
        >
          <div>
            Invoices <strong>{usage.invoicesThisMonth}</strong>
          </div>
          <div>
            Payments <strong>{usage.paymentsThisMonth}</strong>
          </div>
          <div>
            Clients <strong>{usage.clientsTotal}</strong>
          </div>
          <div>
            Open jobs <strong>{usage.openJobs}</strong>
          </div>
          <div>
            Seats <strong style={{ color: activeCount >= limits.users ? '#f59e0b' : 'inherit' }}>
              {activeCount}/{limits.users}
            </strong>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Solo ≤1 seat · Shop ≤5 · Multi ≤25 — switch seat applies RoleGate on money/settings pages.
        </p>
      </div>

      {pinPrompt && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--green, #10b981)' }}>
          <strong>PIN for {pinPrompt.name}</strong>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>
            This seat is PIN-protected. Enter PIN to switch.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN"
              style={{ maxWidth: 140 }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={confirmPin}>
              Switch
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPinPrompt(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Optional PIN (switch lock)</label>
          <input
            className="input"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value })}
            maxLength={8}
            placeholder="Empty = no PIN"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary">
            {form.id ? 'Update seat' : 'Add seat'}
          </button>
          {form.id ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setForm({ name: '', email: '', role: 'tech', pin: '', id: '' })}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Roles</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {ROLES.map((r) => (
            <li key={r.id}>
              <strong>{r.label}</strong> — {r.description}
            </li>
          ))}
        </ul>
      </div>

      {!seats.length ? (
        <EmptyState
          title="No seats yet"
          hint="Add technicians and front desk as seats for Shop / Multi licenses. PIN optional for switch lock."
        />
      ) : (
        <div className="card">
          {seats.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '10px 0',
                borderBottom: '1px solid var(--border,rgba(255,255,255,.08))',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <strong>{s.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {ROLES.find((r) => r.id === s.role)?.label || s.role}
                  {s.email ? ` · ${s.email}` : ''}
                  {s.pin ? ' · PIN' : ''}
                  {active === s.id ? ' · ACTIVE' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => requestSwitch(s)}>
                  Switch
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setForm({
                      name: s.name,
                      email: s.email || '',
                      role: s.role,
                      pin: s.pin || '',
                      id: s.id,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    await removeSeat(s.id)
                    await reload()
                    toast('Removed', 'success')
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageFade>
  )
}
