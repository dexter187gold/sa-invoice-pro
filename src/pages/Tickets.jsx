import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { Sync } from '../lib/sync'

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

const EMPTY_FORM = {
  title: '', clientId: '', status: 'open', priority: 'normal',
  notes: '', description: '', workDone: '', contactName: '', contactPhone: '',
  contactEmail: '', category: '', dueDate: '', assignee: '', supportType: 'remote',
}

export default function Tickets() {
  const { toast, refresh } = useApp()
  const nav = useNavigate()
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const load = useCallback(async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
    setClients((await db.getAll(STORES.clients)) || [])
    if (refresh) await refresh()
  }, [refresh])

  useEffect(() => { load() }, [load])

  const clientOf = (t) => clients.find((x) => String(x.id) === String(t?.clientId))

  const pushTicketCloud = async (ticket, client) => {
    if (!Sync.isLoggedIn()) return
    try {
      await Sync.pushTicketStatus({
        id: ticket.id,
        status: ticket.status || 'open',
        priority: ticket.priority || 'normal',
        title: ticket.title || ticket.subject || '',
        description: ticket.description || '',
        workDone: ticket.workDone || '',
        notes: ticket.notes || '',
        customer_phone: ticket.contactPhone || client?.phone || '',
        contactPhone: ticket.contactPhone || client?.phone || '',
        customer_name: ticket.contactName || client?.name || '',
        clientId: ticket.clientId || null,
        client_id: ticket.clientId || null,
        intake_id: ticket.intakeId || null,
      })
    } catch (e) {
      console.warn('[Tickets] pushTicketCloud', e.message || e)
    }
  }

  const list = useMemo(() => {
    let rows = (tickets || []).filter((t) => !t.parentId)
    const qq = q.trim().toLowerCase()
    if (qq) {
      rows = rows.filter((t) => {
        const c = clients.find((x) => String(x.id) === String(t.clientId))
        return [t.title, t.subject, t.notes, t.description, t.contactName, t.contactPhone, c?.name]
          .join(' ').toLowerCase().includes(qq)
      })
    }
    if (filterStatus) rows = rows.filter((t) => String(t.status || 'open') === filterStatus)
    if (!showClosed) rows = rows.filter((t) => !['closed', 'cancelled'].includes(String(t.status || '').toLowerCase()))
    rows.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    return rows
  }, [tickets, clients, q, filterStatus, showClosed])

  const openNew = () => { setForm({ ...EMPTY_FORM }); setEditing('new') }
  const openEdit = (t) => {
    setForm({
      title: t.title || t.subject || '', clientId: t.clientId ? String(t.clientId) : '',
      status: t.status || 'open', priority: t.priority || 'normal',
      notes: t.notes || '', description: t.description || '', workDone: t.workDone || '',
      contactName: t.contactName || '', contactPhone: t.contactPhone || '',
      contactEmail: t.contactEmail || '', category: t.category || '',
      dueDate: (t.dueDate || '').slice(0, 10), assignee: t.assignee || '',
      supportType: t.supportType === 'onsite' ? 'onsite' : 'remote',
    })
    setEditing(t)
  }

  const save = async (e) => {
    e?.preventDefault?.()
    if (!form.title.trim()) return toast('Title required', 'error')
    const payload = {
      title: form.title.trim(), subject: form.title.trim(),
      clientId: form.clientId || null, status: form.status || 'open',
      priority: form.priority || 'normal', notes: form.notes || '',
      description: form.description || '', workDone: form.workDone || '',
      contactName: form.contactName || '', contactPhone: form.contactPhone || '',
      contactEmail: form.contactEmail || '', category: form.category || '',
      dueDate: form.dueDate || null, assignee: form.assignee || '',
      supportType: form.supportType === 'onsite' ? 'onsite' : 'remote',
      updatedAt: new Date().toISOString(), system: 'classic',
    }
    try {
      if (editing && editing !== 'new' && editing.id != null) {
        const updated = { ...editing, ...payload }
        await db.put(STORES.tickets, updated)
        await pushTicketCloud(updated, clientOf(updated))
        toast('Job card updated', 'success')
      } else {
        const created = await db.add(STORES.tickets, {
          ...payload,
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          timerStatus: 'idle', timerAccumulatedMs: 0,
        })
        await pushTicketCloud(created, clientOf(created))
        toast('Job card created', 'success')
      }
      setEditing(null)
      await load()
    } catch (err) {
      toast(err.message || 'Save failed', 'error')
    }
  }

  const setStatus = async (t, status) => {
    const next = { ...t, status, updatedAt: new Date().toISOString() }
    await db.put(STORES.tickets, next)
    await pushTicketCloud(next, clientOf(next))
    await load()
    toast('Status → ' + status, 'success')
  }

  const remove = async (id) => {
    if (!confirm('Delete this job card?')) return
    await db.remove(STORES.tickets, id)
    toast('Job card deleted', 'success')
    setEditing(null)
    await load()
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1>Job cards</h1>
          <p className="subtitle muted">{list.length} jobs · status syncs to WhatsApp when cloud is on</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>New job card</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 180 }} />
        <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
        </label>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{editing === 'new' ? 'New job card' : 'Edit job card'}</h3>
          <form onSubmit={save}>
            <label className="muted">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <label className="muted">Client</label>
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">— None —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label className="muted">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="muted">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <label className="muted">Contact phone (WhatsApp)</label>
            <input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="082…" />
            <label className="muted">Contact name</label>
            <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <label className="muted">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="muted">Work done</label>
            <textarea className="input" rows={2} value={form.workDone} onChange={(e) => setForm({ ...form, workDone: e.target.value })} />
            <label className="muted">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              {editing !== 'new' && editing?.id && (
                <button type="button" className="btn btn-outline" style={{ color: '#dc2626' }} onClick={() => remove(editing.id)}>Delete</button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {!list.length && <p className="muted">No job cards yet.</p>}
        {list.map((t) => (
          <div key={t.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <strong>{t.title || t.subject || 'Job'}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {[t.status, t.priority, t.contactName || clientOf(t)?.name, t.contactPhone || clientOf(t)?.phone].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>
              {t.status !== 'in_progress' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'in_progress')}>Start</button>
              )}
              {t.status !== 'resolved' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'resolved')}>Resolve</button>
              )}
              {t.status !== 'closed' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'closed')}>Close</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
