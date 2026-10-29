import React, { useState } from 'react'
import { Sync } from '../lib/sync'
import { ROLES, listSeats, upsertSeat, getActiveSeatId } from '../lib/seats'

/**
 * Break-glass recovery for local desk seats.
 * A role shown in the browser is never proof of owner status: require a fresh
 * cloud sign-in and confirm ownership through the server before showing controls.
 */
export default function OwnerRecovery() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [owner, setOwner] = useState(null)
  const [seats, setSeats] = useState([])
  const [activeId, setActiveId] = useState('')
  const [pinDrafts, setPinDrafts] = useState({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function verifyOwner(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await Sync.login(email.trim().toLowerCase(), password)
      const team = await Sync.getTeam()
      if (!team?.isOwner) {
        setOwner(null)
        setSeats([])
        setError('This cloud account is not the workspace owner. No local roles or PINs were changed.')
        return
      }
      setOwner({ email: team.owner?.email || email.trim().toLowerCase() })
      setSeats(await listSeats())
      setActiveId(await getActiveSeatId())
      setPassword('')
      setMessage('Owner verified by the cloud server. You can now repair local desk-seat roles or set new PINs.')
    } catch (err) {
      setOwner(null)
      setSeats([])
      setError(err?.message || 'Owner verification failed. No local roles or PINs were changed.')
    } finally {
      setBusy(false)
    }
  }

  async function saveSeat(seat, nextRole) {
    if (nextRole && nextRole !== seat.role && !window.confirm('Change ' + (seat.name || seat.email || 'this seat') + ' to ' + nextRole.replace('_', ' ') + '?')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const pin = String(pinDrafts[seat.id] || '').trim()
      if (pin && !/^\d{4,8}$/.test(pin)) {
        setError('A new PIN must be 4–8 digits. Leave it blank to keep the current PIN.')
        return
      }
      await upsertSeat({
        ...seat,
        role: nextRole || seat.role,
        // Never render the existing PIN. Preserve it unless the owner enters a replacement.
        pin: pin || seat.pin || '',
      })
      setSeats(await listSeats())
      setPinDrafts((old) => ({ ...old, [seat.id]: '' }))
      setMessage('Seat saved. The new role applies on the next permission check. A PIN was changed only if you entered a new one.')
    } catch (err) {
      setError(err?.message || 'Could not save this seat.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Owner account recovery</h1>
          <p className="subtitle">A restricted recovery path for a locked desk role. Owner identity is checked by the cloud server.</p>
        </div>
      </div>

      {!owner ? (
        <form className="card stack" onSubmit={verifyOwner} style={{ maxWidth: 560, gap: 12 }}>
          <h2 style={{ marginTop: 0 }}>Verify workspace owner</h2>
          <p className="muted">Sign in again with the workspace owner’s cloud account. A local seat role alone can never authorize recovery.</p>
          <label>Email<input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify owner and unlock recovery'}</button>
        </form>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="card">
            <strong>Owner verified</strong>
            <p className="muted" style={{ marginBottom: 0 }}>Verified cloud owner: {owner.email}. This screen changes local seats on this device only; it does not reset cloud passwords or change server-side team roles.</p>
          </div>
          {seats.length === 0 ? (
            <div className="card">No local seats were found on this device. Cloud team roles are managed separately in Team.</div>
          ) : seats.map((seat) => (
            <div className="card stack" key={seat.id} style={{ gap: 10 }}>
              <div>
                <strong>{seat.name || 'Unnamed seat'}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{seat.email || 'No email'} · {seat.active === false ? 'Inactive' : 'Active'}{String(seat.id) === String(activeId) ? ' · Current seat' : ''}</div>
              </div>
              <label>Role
                <select className="input" value={seat.role || 'tech'} disabled={busy} onChange={(e) => saveSeat(seat, e.target.value)}>
                  {ROLES.map((role) => <option value={role.id} key={role.id}>{role.label}</option>)}
                </select>
              </label>
              <label>Set a new PIN (optional)
                <input className="input" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" maxLength={8} placeholder="Leave blank to keep existing PIN" value={pinDrafts[seat.id] || ''} onChange={(e) => setPinDrafts((old) => ({ ...old, [seat.id]: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />
              </label>
              <button className="btn btn-outline" type="button" disabled={busy || !String(pinDrafts[seat.id] || '').trim()} onClick={() => saveSeat(seat, seat.role)}>Save new PIN</button>
            </div>
          ))}
          <button className="btn btn-outline" type="button" onClick={() => { setOwner(null); setSeats([]); setActiveId(''); setPinDrafts({}); setMessage(''); }}>Lock recovery screen</button>
        </div>
      )}
      {message && <p role="status" className="muted">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  )
}
