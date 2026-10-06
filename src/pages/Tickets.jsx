import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'

const STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
]
const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]

export default function Tickets() {
  const { toast, company } = useApp()
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [view, setView] = useState('list')
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', clientId: '', status: 'open', priority: 'normal', notes: '' })

  const load = useCallback(async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
    setClients((await db.getAll(STORES.clients)) || [])
  }, [])

  useEffect(() => {
    load()
    try { localStorage.setItem('sa_ticket_mode', 'classic') } catch (e) {}
  }, [load])

  const list = useMemo(() => {
    let rows = (tickets || []).filter((t) => !t.parentId)
    const qq = q.trim().toLowerCase()
    if (qq) {
      rows = rows.filter((t) => {
        const c = clients.find((x) => String(x.id) === String(t.clientId))
        return [t.title, t.subject, t.notes, t.status, c?.name].join(' ').toLowerCase().includes(qq)
      })
    }
    if (filterStatus) rows = rows.filter((t) => String(t.status || 'open') === filterStatus)
    if (!showClosed) rows = rows.filter((t) => !['closed', 'cancelled'].includes(String(t.status || '').toLowerCase()))
    rows.sort((a, b) => String(b.updatedAt || b.createdAt || b.date || '').localeCompare(String(a.updatedAt || a.createdAt || a.date || '')))
    return rows
  }, [tickets, clients, q, filterStatus, showClosed])

  const stats = useMemo(() => {
    const root = (tickets || []).filter((t) => !t.parentId)
    return {
      open: root.filter((t) => (t.status || 'open') === 'open').length,
      prog: root.filter((t) => t.status === 'in_progress').length,
      wait: root.filter((t) => t.status === 'waiting').length,
      urgent: root.filter((t) => t.priority === 'urgent' && !['closed', 'resolved'].includes(t.status)).length,
    }
  }, [tickets])

  const openNew = () => {
    setForm({ title: '', clientId: '', status: 'open', priority: 'normal', notes: '' })
    setEditing('new')
  }

  const openEdit = (t) => {
    setForm({
      title: t.title || t.subject || '',
      clientId: t.clientId ? String(t.clientId) : '',
      status: t.status || 'open',
      priority: t.priority || 'normal',
      notes: t.notes || t.description || '',
    })
    setEditing(t)
  }

  const save = async (e) => {
    e?.preventDefault?.()
    if (!form.title.trim()) return toast('Title required', 'error')
    const payload = {
      title: form.title.trim(),
      subject: form.title.trim(),
      clientId: form.clientId || null,
      status: form.status || 'open',
      priority: form.priority || 'normal',
      notes: form.notes || '',
      updatedAt: new Date().toISOString(),
      system: 'classic',
    }
    try {
      if (editing && editing !== 'new' && editing.id != null) {
        await db.put(STORES.tickets, { ...editing, ...payload })
        toast('Ticket updated', 'success')
      } else {
        await db.add(STORES.tickets, {
          ...payload,
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        })
        toast('Ticket created', 'success')
      }
      setEditing(null)
      await load()
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this ticket?')) return
    await db.remove(STORES.tickets, id)
    toast('Deleted', 'success')
    setEditing(null)
    await load()
  }

  const setStatus = async (t, status) => {
    await db.put(STORES.tickets, { ...t, status, updatedAt: new Date().toISOString() })
    await load()
    toast('Status → ' + status, 'success')
  }

  const card = (t) => {
    const c = clients.find((x) => String(x.id) === String(t.clientId))
    return (
      <div key={t.id} className="list-card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <strong>{t.title || t.subject || 'Ticket'}</strong>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              <span className="badge">{t.status || 'open'}</span>{' '}
              <span className="badge warn">{t.priority || 'normal'}</span>
              {c ? ` · ${c.name}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Open</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'in_progress')}>Start</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'resolved')}>Resolve</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Tickets · Team desk</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Native jobs for {company?.name || 'your business'} — Helix iframe removed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button type="button" className={`btn btn-sm ${view === 'board' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('board')}>Board</button>
          <button type="button" className="btn btn-primary" onClick={openNew}>New ticket</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8, marginBottom: 12 }}>
        {[['Open', stats.open], ['In progress', stats.prog], ['Waiting', stats.wait], ['Urgent', stats.urgent]].map(([label, n]) => (
          <div key={label} className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{n}</div>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
        </label>
      </div>

      {view === 'board' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STATUSES.filter((s) => s.id !== 'closed' || showClosed).map((col) => {
            const items = list.filter((t) => String(t.status || 'open') === col.id)
            return (
              <div key={col.id} style={{ minWidth: 260, width: 280, background: 'var(--surface-2, #f1f5f9)', borderRadius: 12, padding: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, padding: '6px 8px 10px' }}>{col.label} ({items.length})</div>
                {items.length ? items.map(card) : <p className="muted" style={{ fontSize: 12, padding: 8 }}>Empty</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <div>
          {list.map(card)}
          {!list.length && (
            <div className="card empty">
              No tickets yet. Click <strong>New ticket</strong> to log a job or support request.
            </div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editing === 'new' ? 'New ticket' : 'Edit ticket'}</h2>
            <form className="form-grid" onSubmit={save}>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <label className="label">Client</label>
              <select className="select" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">—</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="label">Details</label>
              <textarea className="input" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                {editing !== 'new' && editing.id != null && (
                  <button type="button" className="btn btn-outline" style={{ color: '#b91c1c' }} onClick={() => remove(editing.id)}>Delete</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
