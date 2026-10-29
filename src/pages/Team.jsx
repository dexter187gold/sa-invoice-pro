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
import { Sync } from '../lib/sync'

export default function Team() {
  const { toast, invoices, clients, tickets, payments, company, user } = useApp()
  const [seats, setSeats] = useState([])
  const [active, setActive] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'tech', pin: '', id: '' })
  const [pinPrompt, setPinPrompt] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [cloudTeam, setCloudTeam] = useState(null)
  const [inviteRole, setInviteRole] = useState('tech')
  const [newInvite, setNewInvite] = useState(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  const reloadCloudTeam = async () => {
    if (!user?.cloud || !Sync.isLoggedIn()) return
    try { setCloudTeam(await Sync.getTeam()) } catch (err) { setCloudTeam({ error: err?.message || 'Cloud team unavailable' }) }
  }
  useEffect(() => { reloadCloudTeam() }, [user?.id, user?.cloud])

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

      {user?.cloud && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Cloud team accounts</h2>
          <p className="muted" style={{ fontSize: 13 }}>Each teammate signs in with their own email and password. Invite codes assign a server-side role to that account.</p>
          {cloudTeam?.error && <p role="alert" className="muted">{cloudTeam.error}</p>}
          {cloudTeam?.owner && <p className="muted" style={{ fontSize: 12 }}>Workspace owner: {cloudTeam.owner.email} · {cloudTeam.isOwner ? 'You can invite members' : 'Only the owner can invite members'}</p>}
          {cloudTeam?.members?.length > 0 && <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
            {cloudTeam.members.map((member) => <div key={member.id} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: 8, border: '1px solid var(--border, #d1d5db)', borderRadius: 8 }}>
              <span><strong>{member.name || member.email}</strong><br /><span className="muted" style={{ fontSize: 12 }}>{member.email}</span></span>
              {cloudTeam.isOwner && !member.isOwner ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span className="muted">Role</span>
                  <select
                    className="input"
                    aria-label={`Role for ${member.email}`}
                    value={member.role || 'member'}
                    disabled={cloudBusy}
                    style={{ minWidth: 130 }}
                    onChange={async (e) => {
                      const role = e.target.value
                      if (!role || !window.confirm(`Change ${member.email}'s role to ${role.replace('_', ' ')}?`)) {
                        await reloadCloudTeam()
                        return
                      }
                      setCloudBusy(true)
                      try {
                        await Sync.updateTeamMemberRole(member.id, role)
                        await reloadCloudTeam()
                        toast('Team member role updated', 'success')
                      } catch (err) {
                        await reloadCloudTeam()
                        toast(err?.message || 'Could not update team role', 'error')
                      } finally {
                        setCloudBusy(false)
                      }
                    }}
                  >
                    {!ROLES.some((r) => r.id === member.role) && <option value={member.role || 'member'}>{member.role || 'member'} (legacy)</option>}
                    {ROLES.filter((r) => r.id !== 'owner').map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
              ) : <span className="chip">{member.role || 'member'}{member.isOwner ? ' · owner' : ''}</span>}
            </div>)}
          </div>}
          {cloudTeam?.isOwner && <div className="form-grid cols-2">
            <div><label className="label">Invite role</label><select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.filter((r) => r.id !== 'owner').map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select></div>
            <div style={{ display: 'flex', alignItems: 'end' }}><button type="button" className="btn btn-primary" disabled={cloudBusy} onClick={async () => {
              setCloudBusy(true)
              try { const inv = await Sync.createTeamInvite(inviteRole); setNewInvite(inv); await reloadCloudTeam(); toast('Invite code created', 'success') }
              catch (err) { toast(err?.message || 'Could not create invite', 'error') }
              finally { setCloudBusy(false) }
            }}>{cloudBusy ? 'Creating…' : 'Create invite code'}</button></div>
          </div>}
          {newInvite && <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border, #d1d5db)', borderRadius: 8 }}>
            <strong>Invite code · {newInvite.role}</strong>
            <p style={{ fontSize: 24, fontFamily: 'monospace', letterSpacing: '.12em', margin: '4px 0' }}>{newInvite.code}</p>
            <p className="muted" style={{ fontSize: 12 }}>Expires: {newInvite.expires ? new Date(newInvite.expires).toLocaleString() : 'in 7 days'}. Share this code with the teammate. They enter it on the Create account screen.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(newInvite.code).catch(() => {}); toast('Invite code copied if clipboard permission was granted', 'info') }}>Copy code</button>
          </div>}
        </div>
      )}

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
