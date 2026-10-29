import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sync } from '../lib/sync'
import { PageFade } from '../components/ui'

export default function PortalAdmin() {
  const [state, setState] = useState('loading')
  const [accounts, setAccounts] = useState([])
  const [busyEmail, setBusyEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newPin, setNewPin] = useState(null)

  async function load() {
    setError('')
    try {
      const team = await Sync.getTeam()
      if (!team?.isOwner) {
        setState('denied')
        return
      }
      const data = await Sync.listClientPortalAccounts()
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setState('ready')
    } catch (e) {
      setError(e?.message || 'Could not load client portal accounts')
      setState('error')
    }
  }

  useEffect(() => { load() }, [])

  async function toggle(acc) {
    setBusyEmail(acc.email); setError(''); setNotice(''); setNewPin(null)
    try {
      const data = await Sync.setClientPortalAccountActive(acc.email, !acc.active)
      setAccounts((rows) => rows.map((r) => r.email === acc.email ? { ...r, active: data.account.active, updatedAt: data.account.updatedAt } : r))
      setNotice(acc.active ? 'Portal access disabled.' : 'Portal access enabled.')
    } catch (e) { setError(e?.message || 'Could not update portal access') }
    finally { setBusyEmail('') }
  }

  async function resetPin(acc) {
    if (!window.confirm('Generate a new PIN for ' + acc.email + '? The old PIN will stop working.')) return
    setBusyEmail(acc.email); setError(''); setNotice(''); setNewPin(null)
    try {
      const data = await Sync.resetClientPortalPin(acc.email)
      setNewPin({ email: acc.email, pin: data.pin })
      setNotice('New PIN generated. Share it with the client through a trusted channel; it is shown only here.')
    } catch (e) { setError(e?.message || 'Could not reset client PIN') }
    finally { setBusyEmail('') }
  }

  return <PageFade>
    <div className="page-header"><div><h1>Client portal administration</h1><p className="subtitle">Manage portal access for clients in your verified workspace.</p></div><button className="btn btn-outline" onClick={load}>Refresh</button></div>
    <p><Link to="/clients">← Back to clients</Link></p>
    {state === 'loading' && <div className="card">Verifying owner access and loading accounts…</div>}
    {state === 'denied' && <div className="card"><h2>Owner access required</h2><p>This console requires server-verified workspace owner access. A local seat role cannot grant access.</p><Link className="btn" to="/owner-recovery">Owner recovery</Link></div>}
    {state === 'error' && <div className="card" role="alert">{error}</div>}
    {error && state !== 'error' && <div className="card" role="alert">{error}</div>}
    {notice && <div className="card" role="status">{notice}</div>}
    {newPin && <div className="card"><strong>Replacement PIN for {newPin.email}</strong><p style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>{newPin.pin}</p><button className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(newPin.email + '\\nPIN: ' + newPin.pin).then(() => setNotice('PIN copied. Share it through a trusted channel.')).catch(() => setError('Clipboard unavailable; select and copy the PIN manually.'))}>Copy login details</button><button className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => setNewPin(null)}>Hide PIN</button></div>}
    {state === 'ready' && (accounts.length ? accounts.map((acc) => <div className="card" key={acc.email}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div><strong>{acc.name || acc.email}</strong><div className="muted">{acc.email}</div><div className="muted" style={{ fontSize: 12 }}>Client ID: {acc.clientId || '—'} · Last login: {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : 'Never'}</div><div className="muted" style={{ fontSize: 12 }}>{acc.counts?.invoices || 0} invoices · {acc.counts?.quotes || 0} quotes · {acc.counts?.tickets || 0} jobs</div></div>
        <span className="badge">{acc.active ? 'Active' : 'Disabled'}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button className="btn btn-outline" disabled={!!busyEmail} onClick={() => toggle(acc)}>{busyEmail === acc.email ? 'Saving…' : acc.active ? 'Disable portal access' : 'Enable portal access'}</button>
        <button className="btn btn-outline" disabled={!!busyEmail || !acc.active} onClick={() => resetPin(acc)}>Reset client PIN</button>
      </div>
    </div>) : <div className="card">No client portal logins have been issued for this workspace yet. Open Clients and choose Portal login for a client.</div>)}
    <p className="muted" style={{ fontSize: 12 }}>Security: account listing is tenant-scoped by the sync server. PIN hashes and client financial snapshots are never returned to this console. A reset PIN is shown once after an explicit owner action.</p>
  </PageFade>
}
