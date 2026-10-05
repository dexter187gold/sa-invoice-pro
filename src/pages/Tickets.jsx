import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { SA_CONFIG } from '../config'
import { Segmented } from '../components/ui'

const OLIVE = 'https://github.com/dexter187gold/olive-yellow-reef-quartz'

export default function Tickets() {
  const { tickets, clients, refresh, toast } = useApp()
  const [mode, setMode] = useState(() => localStorage.getItem('sa_ticket_mode') || 'classic')
  const [helixUrl, setHelixUrl] = useState(() => localStorage.getItem('sa_helix_url') || SA_CONFIG.helixUrl || '')
  const [embed, setEmbed] = useState(true)
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [q, setQ] = useState('')

  const setModePersist = (m) => {
    setMode(m)
    localStorage.setItem('sa_ticket_mode', m)
  }

  const base = (helixUrl || '').trim().replace(/\/$/, '')
  const src = base ? `${base}${SA_CONFIG.helixPathDesk || '/desk/tickets'}?source=sa-invoice-pro` : ''

  const saveUrl = () => {
    const v = helixUrl.trim().replace(/\/$/, '')
    localStorage.setItem('sa_helix_url', v)
    setHelixUrl(v)
    toast(v ? 'Helix URL saved' : 'Cleared', 'success')
  }

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast('Title required', 'error')
    await db.add(STORES.tickets, {
      title: title.trim(),
      clientId: clientId || null,
      status: 'open',
      priority,
      system: mode,
      date: new Date().toISOString().slice(0, 10),
    })
    setTitle('')
    await refresh()
    toast(mode === 'helix' ? 'Helix ticket saved locally' : 'Classic ticket created', 'success')
  }

  const list = useMemo(() => {
    const sys = mode === 'helix' ? 'helix' : 'classic'
    return tickets.filter((t) => (t.system || 'classic') === sys || (mode === 'classic' && !t.system))
      .filter((t) => !q || String(t.title || '').toLowerCase().includes(q.toLowerCase()))
  }, [tickets, mode, q])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <p className="subtitle">Classic jobs or Helix desk (from olive-yellow-reef-quartz)</p>
        </div>
        <Segmented
          options={[{ id: 'classic', label: 'Classic' }, { id: 'helix', label: 'Helix' }]}
          value={mode === 'helix' ? 'helix' : 'classic'}
          onChange={setModePersist}
        />
      </div>

      {mode === 'helix' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Helix desk</h3>
          <p className="muted">Embedded desk modelled on <a href={OLIVE} target="_blank" rel="noreferrer">olive-yellow-reef-quartz</a> routes <code>/desk</code>. Remote Helix can load in-frame or full page.</p>
          <div className="form-grid cols-2">
            <input className="input" placeholder="https://helix.example" value={helixUrl} onChange={(e) => setHelixUrl(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={saveUrl}>Save URL</button>
          </div>
          <label style={{ display: 'flex', gap: 8, margin: '0.6rem 0' }}>
            <input type="checkbox" checked={embed} onChange={(e) => setEmbed(e.target.checked)} /> Embed remote Helix
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" disabled={!src} onClick={() => window.open(src, '_blank', 'noopener')}>
              Open new tab
            </button>
            <button type="button" className="btn btn-outline" disabled={!src} onClick={() => window.location.assign(src)}>
              Full page
            </button>
          </div>
          {embed && src && (
            <div className="iframe-wrap" style={{ marginTop: 12 }}>
              <iframe title="Helix desk" src={src} />
            </div>
          )}
        </div>
      )}

      <form className="card form-grid cols-3" onSubmit={add} style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder={mode === 'helix' ? 'Helix subject' : 'Ticket title'} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Client (optional)</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button className="btn btn-primary" type="submit">Add {mode === 'helix' ? 'Helix' : 'classic'} ticket</button>
        <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      {list.map((t) => {
        const c = clients.find((x) => String(x.id) === String(t.clientId))
        return (
          <div key={t.id} className="list-card">
            <strong>{t.title}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              <span className="badge">{t.status || 'open'}</span>
              <span className="badge warn" style={{ marginLeft: 6 }}>{t.priority || 'normal'}</span>
              {c ? ` · ${c.name}` : ''} · {t.system || 'classic'}
            </div>
          </div>
        )
      })}
      {!list.length && <div className="card empty">No {mode} tickets yet.</div>}
    </div>
  )
}
