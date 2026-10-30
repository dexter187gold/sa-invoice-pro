import React, { useState } from 'react'
import { Sync } from '../lib/sync'
import { ROLES, listSeats, upsertSeat, getActiveSeatId, clearSeats } from '../lib/seats'

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
  const [resetPin, setResetPin] = useState('')
  const [resetPinConfirm, setResetPinConfirm] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetResult, setResetResult] = useState(null)
  const [resetBusy, setResetBusy] = useState(false)

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


  async function saveWorkspaceResetPin(e) {
    e.preventDefault()
    setResetBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await Sync.setWorkspaceResetPin(resetPin, resetPinConfirm)
      setResetPin('')
      setResetPinConfirm('')
      setMessage(result.message || 'Workspace reset PIN saved. Keep it private.')
    } catch (err) {
      setError(err?.message || 'Could not save the workspace reset PIN.')
    } finally {
      setResetBusy(false)
    }
  }

  async function resetCloudWorkspace(e) {
    e.preventDefault()
    if (resetConfirm !== 'RESET MY WORKSPACE') {
      setError('Type RESET MY WORKSPACE exactly to confirm.')
      return
    }
    const confirmed = window.confirm(
      'This clears this owner workspace, linked team logins, branch workspaces, client portal accounts and support tickets. Your owner login is kept. A private server snapshot is saved first. Continue?'
    )
    if (!confirmed) return
    setResetBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await Sync.resetWorkspace(resetPin, resetConfirm)
      await clearSeats()
      setSeats([])
      setActiveId('')
      setResetResult(result)
      setResetPin('')
      setResetConfirm('')
      setMessage('Cloud workspace reset. Background cloud sync has been paused to prevent old local data from being uploaded. Import your device backup before signing in and syncing again.')
    } catch (err) {
      setError(err?.message || 'Workspace reset failed. No reset success was reported.')
    } finally {
      setResetBusy(false)
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

          <div className="card stack" style={{ gap: 10, border: '1px solid var(--danger, #b91c1c)' }}>
            <div>
              <strong>Beta preparation · reset this workspace</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                This owner-only operation clears this workspace's cloud business records, linked team accounts,
                branch workspaces, client portal accounts, invites and support tickets. Your owner login remains active;
                unrelated customer workspaces are not touched. A private server snapshot is saved first.
              </p>
            </div>
            <form className="stack" onSubmit={saveWorkspaceResetPin} style={{ gap: 8 }}>
              <strong>Set your private reset PIN</strong>
              <label>New recovery PIN
                <input className="input" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6,12}" minLength={6} maxLength={12} required value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 12))} />
              </label>
              <label>Confirm recovery PIN
                <input className="input" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6,12}" minLength={6} maxLength={12} required value={resetPinConfirm} onChange={(e) => setResetPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 12))} />
              </label>
              <button className="btn btn-outline" type="submit" disabled={resetBusy}>{resetBusy ? 'Saving…' : 'Save reset PIN'}</button>
            </form>
            <form className="stack" onSubmit={resetCloudWorkspace} style={{ gap: 8 }}>
              <strong>Run the cloud reset</strong>
              <label>Enter your saved recovery PIN
                <input className="input" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6,12}" minLength={6} maxLength={12} required value={resetPin} onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 12))} />
              </label>
              <label>Type RESET MY WORKSPACE
                <input className="input" autoComplete="off" required value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} />
              </label>
              <button className="btn btn-danger" type="submit" disabled={resetBusy}>{resetBusy ? 'Resetting…' : 'Reset cloud workspace'}</button>
            </form>
            {resetResult && <div role="status" className="muted">
              Reset confirmed · Snapshot {resetResult.snapshotId} · {resetResult.removed?.teamMembers || 0} team logins and {resetResult.removed?.clientPortalAccounts || 0} portal accounts removed. Owner login preserved.
            </div>}
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
