import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { SA_CONFIG } from '../config'

export default function Tickets() {
  const { tickets, clients, refresh, toast } = useApp()
  const [mode, setMode] = useState('local')
  const [helixUrl, setHelixUrl] = useState(() => localStorage.getItem('sa_helix_url') || SA_CONFIG.helixUrl || '')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')

  const base = (helixUrl || '').trim().replace(/\/$/, '')
  const src = base
    ? `${base}${SA_CONFIG.helixPathDesk || '/desk/tickets'}?source=sa-invoice-pro`
    : ''

  const saveUrl = () => {
    const v = helixUrl.trim().replace(/\/$/, '')
    localStorage.setItem('sa_helix_url', v)
    setHelixUrl(v)
    toast(v ? 'Helix URL saved' : 'Cleared', 'success')
  }

  /** Full-page navigation (not iframe) so Helix owns the browser tab */
  const goHelixFullPage = () => {
    if (!src) {
      toast('Set and save a Helix URL first', 'error')
      return
    }
    try {
      localStorage.setItem('sa_helix_url', base)
    } catch {}
    window.location.assign(src)
  }

  const openHelixNewTab = () => {
    if (!src) {
      toast('Set and save a Helix URL first', 'error')
      return
    }
    window.open(src, '_blank', 'noopener,noreferrer')
  }

  const addLocal = async (e) => {
    e.preventDefault()
    if (!title.trim()) return toast('Title required', 'error')
    await db.add(STORES.tickets, {
      title: title.trim(),
      clientId: clientId || null,
      status: 'open',
      date: new Date().toISOString().slice(0, 10),
    })
    setTitle('')
    await refresh()
    toast('Ticket created', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tickets</h1>
          <p className="subtitle">Local jobs or Helix desk (full page)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn ${mode === 'local' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMode('local')}
          >
            Classic
          </button>
          <button
            type="button"
            className={`btn ${mode === 'helix' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setMode('helix')}
          >
            Helix
          </button>
        </div>
      </div>

      {mode === 'helix' ? (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 style={{ marginTop: 0 }}>Helix desk</h3>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Opens Helix as a <strong>full page</strong> (not inside this app). Use the browser Back button to return here.
          </p>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div>
              <label className="label">Helix URL</label>
              <input
                className="input"
                placeholder="https://helix.pcrepairdex.workers.dev"
                value={helixUrl}
                onChange={(e) => setHelixUrl(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={saveUrl}>
              Save URL
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={goHelixFullPage} disabled={!src}>
              Open Helix full page
            </button>
            <button type="button" className="btn btn-outline" onClick={openHelixNewTab} disabled={!src}>
              Open in new tab
            </button>
          </div>
          {src && (
            <p className="muted" style={{ fontSize: 12, marginTop: '1rem', wordBreak: 'break-all' }}>
              Destination: {src}
            </p>
          )}
          {!src && (
            <p className="muted" style={{ marginTop: '1rem' }}>
              Paste your Helix HTTPS URL, Save, then open full page.
            </p>
          )}
        </div>
      ) : (
        <>
          <form className="card form-grid cols-3" onSubmit={addLocal} style={{ marginBottom: '1rem' }}>
            <input
              className="input"
              placeholder="Ticket title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Client (optional)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Add ticket
            </button>
          </form>
          {tickets.map((t) => {
            const c = clients.find((x) => String(x.id) === String(t.clientId))
            return (
              <div key={t.id} className="list-card">
                <strong>{t.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  <span className="badge">{t.status || 'open'}</span>
                  {c ? ` · ${c.name}` : ''}
                </div>
              </div>
            )
          })}
          {!tickets.length && <div className="card empty">No local tickets.</div>}
        </>
      )}
    </div>
  )
}
