import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { Sync } from '../lib/sync'
import { bulkSetTicketStatus, bulkExportCsv, ticketCsvColumns } from '../lib/bulkOps'
import { setTicketStatus as transitionTicket, sortTickets, invoiceFromTicket } from '../lib/ticketActions'
import { ticketLabel } from '../lib/statusLabels'
import { PageFade, SearchInput, EmptyState, formatDateZA, relativeTime } from '../components/ui'

const STATUSES = [
  { id: 'open', label: 'Open', color: '#38bdf8' },
  { id: 'in_progress', label: 'In progress', color: '#a78bfa' },
  { id: 'waiting', label: 'Waiting', color: '#fbbf24' },
  { id: 'resolved', label: 'Resolved', color: '#34d399' },
  { id: 'closed', label: 'Closed', color: '#64748b' },
]
const PRIORITIES = [
  { id: 'urgent', label: 'Urgent' },
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
]

const EMPTY_FORM = {
  title: '', clientId: '', status: 'open', priority: 'normal',
  notes: '', description: '', workDone: '', contactName: '', contactPhone: '',
  contactEmail: '', category: '', dueDate: '', assignee: '', supportType: 'remote',
}

function slaInfo(t) {
  const start = t.createdAt || t.date
  if (!start) return { label: '—', cls: 'sla-ok' }
  const hrs = (Date.now() - new Date(start).getTime()) / 3600000
  const pri = t.priority || 'normal'
  const limit = pri === 'urgent' ? 4 : pri === 'high' ? 12 : pri === 'low' ? 72 : 24
  if (['resolved', 'closed'].includes(t.status)) return { label: 'Done', cls: 'sla-ok' }
  if (hrs > limit) return { label: `${Math.round(hrs - limit)}h over`, cls: 'sla-bad' }
  if (hrs > limit * 0.7) return { label: `${Math.round(limit - hrs)}h left`, cls: 'sla-warn' }
  return { label: `${Math.round(limit - hrs)}h left`, cls: 'sla-ok' }
}

function toWa(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length === 10) return '27' + d.slice(1)
  if (d.startsWith('27')) return d
  return d
}

function buildWaMsg(ticket, company) {
  const name = ticket.contactName || 'there'
  const co = company?.name || 'SA Invoice Pro'
  const st = ticketLabel(ticket.status) || ticket.status
  return `Hi ${name}, update from *${co}* on your job *${ticket.title || ticket.subject || ticket.id}*:\nStatus: *${st}*\n${ticket.workDone ? `Work done: ${ticket.workDone}\n` : ''}We'll keep you posted.`
}

export default function Tickets() {
  const { toast, refresh, invoices, vatRate, vatEnabled, company, clients: ctxClients } = useApp()
  const nav = useNavigate()
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPri, setFilterPri] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [view, setView] = useState(() => localStorage.getItem('sa_ticket_view') || 'kanban')
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [selected, setSelected] = useState({})
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
    setClients((await db.getAll(STORES.clients)) || ctxClients || [])
    if (refresh) await refresh()
  }, [refresh, ctxClients])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    try { localStorage.setItem('sa_ticket_view', view) } catch {}
  }, [view])

  const clientOf = (t) => clients.find((x) => String(x.id) === String(t?.clientId))

  const pushTicketCloud = async (ticket, client) => {
    if (!Sync.isLoggedIn?.()) return
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
      })
    } catch (e) {
      console.warn('[Tickets] push', e?.message || e)
    }
  }

  const list = useMemo(() => {
    let rows = (tickets || []).filter((t) => !t.parentId)
    if (!showClosed) rows = rows.filter((t) => !['closed', 'resolved'].includes(t.status || ''))
    if (filterStatus) rows = rows.filter((t) => (t.status || 'open') === filterStatus)
    if (filterPri) rows = rows.filter((t) => (t.priority || 'normal') === filterPri)
    if (q.trim()) {
      const qq = q.trim().toLowerCase()
      rows = rows.filter((t) => {
        const c = clientOf(t)
        const blob = [t.title, t.subject, t.description, t.notes, t.contactName, t.contactPhone, c?.name]
          .filter(Boolean).join(' ').toLowerCase()
        return blob.includes(qq)
      })
    }
    return sortTickets(rows, 'priority')
  }, [tickets, clients, q, filterStatus, filterPri, showClosed])

  const stats = useMemo(() => {
    const s = { open: 0, in_progress: 0, waiting: 0, overdue: 0, all: tickets.length }
    for (const t of tickets || []) {
      const st = t.status || 'open'
      if (s[st] != null) s[st]++
      if (!['resolved', 'closed'].includes(st) && slaInfo(t).cls === 'sla-bad') s.overdue++
    }
    return s
  }, [tickets])

  const byStatus = useMemo(() => {
    const map = {}
    for (const st of STATUSES) map[st.id] = []
    for (const t of list) {
      const st = t.status || 'open'
      if (!map[st]) map[st] = []
      map[st].push(t)
    }
    return map
  }, [list])

  const selectedTicket = useMemo(
    () => tickets.find((t) => String(t.id) === String(selectedId)) || null,
    [tickets, selectedId],
  )

  const openNew = () => {
    setEditing('new')
    setForm({ ...EMPTY_FORM })
    setSelectedId(null)
  }

  const openEdit = (t) => {
    setSelectedId(t.id)
    setEditing(t.id)
    setForm({
      title: t.title || t.subject || '',
      clientId: t.clientId || '',
      status: t.status || 'open',
      priority: t.priority || 'normal',
      notes: t.notes || '',
      description: t.description || '',
      workDone: t.workDone || '',
      contactName: t.contactName || '',
      contactPhone: t.contactPhone || '',
      contactEmail: t.contactEmail || '',
      category: t.category || '',
      dueDate: (t.dueDate || '').slice(0, 10),
      assignee: t.assignee || '',
      supportType: t.supportType || 'remote',
    })
  }

  const save = async (e) => {
    e?.preventDefault?.()
    if (!form.title.trim()) return toast('Title required', 'error')
    const payload = {
      ...form,
      title: form.title.trim(),
      subject: form.title.trim(),
      updatedAt: new Date().toISOString(),
    }
    if (editing === 'new') {
      payload.createdAt = new Date().toISOString()
      payload.statusHistory = [{ status: payload.status, at: payload.createdAt, note: 'Created' }]
      const created = await db.add(STORES.tickets, payload)
      await pushTicketCloud(created, clientOf(created))
      toast('Job card created', 'success')
      setSelectedId(created.id)
    } else {
      const prev = tickets.find((t) => String(t.id) === String(editing))
      const history = Array.isArray(prev?.statusHistory) ? [...prev.statusHistory] : []
      if (prev && prev.status !== payload.status) {
        history.push({ status: payload.status, at: payload.updatedAt, note: 'Edited' })
      }
      const updated = { ...prev, ...payload, id: editing, statusHistory: history.slice(-40) }
      await db.put(STORES.tickets, updated)
      await pushTicketCloud(updated, clientOf(updated))
      toast('Job card saved', 'success')
    }
    setEditing(null)
    await load()
  }

  const setStatus = async (t, status) => {
    try {
      const next = await transitionTicket(t.id, status, note || undefined)
      await pushTicketCloud(next, clientOf(next))
      await load()
      toast('Status → ' + ticketLabel(status), 'success')
      setNote('')
    } catch {
      const next = { ...t, status, updatedAt: new Date().toISOString() }
      await db.put(STORES.tickets, next)
      await pushTicketCloud(next, clientOf(next))
      await load()
      toast('Status → ' + status, 'success')
    }
  }

  const addInternalNote = async (t) => {
    if (!note.trim()) return
    const history = Array.isArray(t.statusHistory) ? [...t.statusHistory] : []
    history.push({ status: t.status, at: new Date().toISOString(), note: note.trim(), internal: true })
    const next = { ...t, statusHistory: history.slice(-40), notes: [t.notes, note.trim()].filter(Boolean).join('\n'), updatedAt: new Date().toISOString() }
    await db.put(STORES.tickets, next)
    setNote('')
    await load()
    toast('Note added', 'success')
  }

  const openWhatsApp = (t, custom) => {
    const phone = t.contactPhone || clientOf(t)?.phone || ''
    const wa = toWa(phone)
    const msg = custom || buildWaMsg(t, company)
    const url = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast(wa ? 'Opening WhatsApp…' : 'No phone — WhatsApp opened without number', wa ? 'success' : 'info')
  }

  const billTicket = async (ticket) => {
    try {
      const inv = await invoiceFromTicket(ticket, {
        invoices: invoices || [],
        vatRate: vatRate ?? 0.15,
        vatEnabled: vatEnabled !== false,
      })
      await refresh?.()
      toast(`Invoice ${inv.number} created`, 'success')
      nav(`/invoices/${inv.id}`)
    } catch (e) {
      toast(e?.message || 'Could not create invoice', 'error')
    }
  }

  const exportTicketsCsv = async () => {
    const rows = list
    await bulkExportCsv(rows, ticketCsvColumns(), `tickets-${new Date().toISOString().slice(0, 10)}.csv`)
    toast(`Exported ${rows.length} job cards`, 'success')
  }

  const remove = async (id) => {
    if (!confirm('Delete this job card?')) return
    await db.remove(STORES.tickets, id)
    toast('Deleted', 'success')
    setEditing(null)
    setSelectedId(null)
    await load()
  }

  const detail = selectedTicket

  return (
    <PageFade>
      <div className="ticket-desk">
        <div className="page-header">
          <div>
            <h1>Job desk</h1>
            <p className="subtitle">
              Interactive pipeline · SLA timers · WhatsApp updates · bill when done
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn btn-outline" to="/inbox">WhatsApp inbox</Link>
            <button type="button" className="btn btn-outline" onClick={exportTicketsCsv}>Export</button>
            <button type="button" className="btn btn-primary" onClick={openNew}>New job</button>
          </div>
        </div>

        <div className="ticket-stats">
          <div className="ticket-stat"><div className="n">{stats.open}</div><div className="l">Open</div></div>
          <div className="ticket-stat"><div className="n">{stats.in_progress}</div><div className="l">In progress</div></div>
          <div className="ticket-stat"><div className="n">{stats.waiting}</div><div className="l">Waiting</div></div>
          <div className="ticket-stat"><div className="n" style={{ color: stats.overdue ? 'var(--danger)' : undefined }}>{stats.overdue}</div><div className="l">SLA risk</div></div>
        </div>

        <div className="ticket-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Search jobs, client, phone…" />
          <select className="input" style={{ width: 'auto' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={filterPri} onChange={(e) => setFilterPri(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <label className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show closed
          </label>
          <div className="view-toggle" style={{ marginLeft: 'auto' }}>
            <button type="button" className={view === 'kanban' ? 'on' : ''} onClick={() => setView('kanban')}>Board</button>
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </div>

        {editing ? (
          <form className="card" onSubmit={save} style={{ padding: 16, display: 'grid', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{editing === 'new' ? 'New job card' : 'Edit job'}</h3>
            <input className="input" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">— Client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <input className="input" placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              <input className="input" placeholder="Phone (WhatsApp)" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select className="input" value={form.supportType} onChange={(e) => setForm({ ...form, supportType: e.target.value })}>
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
            <textarea className="input" rows={3} placeholder="Description / issue" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <textarea className="input" rows={2} placeholder="Work done" value={form.workDone} onChange={(e) => setForm({ ...form, workDone: e.target.value })} />
            <textarea className="input" rows={2} placeholder="Internal notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        ) : null}

        <div className="ticket-split">
          <div>
            {view === 'kanban' ? (
              <div className="kanban">
                {STATUSES.filter((s) => showClosed || !['resolved', 'closed'].includes(s.id)).map((st) => (
                  <div key={st.id} className="kanban-col">
                    <div className="kanban-col-head">
                      <span style={{ color: st.color }}>{st.label}</span>
                      <span className="count">{(byStatus[st.id] || []).length}</span>
                    </div>
                    <div className="kanban-cards">
                      {(byStatus[st.id] || []).map((t) => {
                        const sla = slaInfo(t)
                        const c = clientOf(t)
                        return (
                          <button
                            type="button"
                            key={t.id}
                            className={`ticket-card ${selectedId === t.id ? 'selected' : ''}`}
                            onClick={() => setSelectedId(t.id)}
                            onDoubleClick={() => openEdit(t)}
                          >
                            <div className="t-title">
                              <span className={`pri-dot pri-${t.priority || 'normal'}`} />{' '}
                              {t.title || t.subject || 'Untitled'}
                            </div>
                            <div className="t-meta">
                              <span>{c?.name || t.contactName || '—'}</span>
                              <span className={`sla-badge ${sla.cls}`}>{sla.label}</span>
                              <span>{relativeTime(t.updatedAt || t.createdAt)}</span>
                            </div>
                          </button>
                        )
                      })}
                      {!(byStatus[st.id] || []).length ? (
                        <div className="muted" style={{ fontSize: 12, padding: 8 }}>Empty</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {!list.length ? (
                  <EmptyState title="No job cards" hint="Create a job or import from WhatsApp inbox." action={<button type="button" className="btn btn-primary" onClick={openNew}>New job</button>} />
                ) : (
                  list.map((t) => {
                    const sla = slaInfo(t)
                    const c = clientOf(t)
                    return (
                      <div
                        key={t.id}
                        className={`ticket-list-row ${selectedId === t.id ? 'on' : ''}`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <span className={`pri-dot pri-${t.priority || 'normal'}`} />
                        <div>
                          <strong style={{ fontSize: 13 }}>{t.title || t.subject}</strong>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {c?.name || t.contactName || '—'} · {ticketLabel(t.status)} · {relativeTime(t.updatedAt || t.createdAt)}
                          </div>
                        </div>
                        <span className={`sla-badge ${sla.cls}`}>{sla.label}</span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <aside className="ticket-detail">
            {!detail ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Select a job card to see timeline, WhatsApp actions, and SLA.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div>
                    <h2>{detail.title || detail.subject}</h2>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {clientOf(detail)?.name || detail.contactName || 'No client'} · {formatDateZA(detail.createdAt)}
                    </div>
                  </div>
                  <span className={`sla-badge ${slaInfo(detail).cls}`}>{slaInfo(detail).label}</span>
                </div>

                <div className="status-pipeline">
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={(detail.status || 'open') === s.id ? 'on' : ''}
                      onClick={() => setStatus(detail, s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="wa-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openWhatsApp(detail)}>
                    WhatsApp update
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openWhatsApp(detail, `Hi, your device is ready for collection. — ${company?.name || 'SA Invoice Pro'}`)}>
                    Ready WA
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(detail)}>Edit</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => billTicket(detail)}>Bill</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(detail.id)}>Delete</button>
                </div>

                {detail.description ? (
                  <p style={{ fontSize: 13, marginTop: 12 }}><strong>Issue:</strong> {detail.description}</p>
                ) : null}
                {detail.workDone ? (
                  <p style={{ fontSize: 13 }}><strong>Work done:</strong> {detail.workDone}</p>
                ) : null}

                <div style={{ marginTop: 12 }}>
                  <label className="label">Add note / comment</label>
                  <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note or status comment…" />
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={() => addInternalNote(detail)}>
                    Add to timeline
                  </button>
                </div>

                <h4 style={{ margin: '16px 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)' }}>
                  Timeline
                </h4>
                <div className="timeline">
                  {(detail.statusHistory || []).slice().reverse().map((h, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-body">
                        <div><strong>{ticketLabel(h.status) || h.status}</strong>{h.internal ? ' · note' : ''}</div>
                        {h.note ? <div>{h.note}</div> : null}
                        <div className="when">{relativeTime(h.at)} · {formatDateZA(h.at)}</div>
                      </div>
                    </div>
                  ))}
                  {!(detail.statusHistory || []).length ? (
                    <div className="muted" style={{ fontSize: 12 }}>No history yet — change status to start the timeline.</div>
                  ) : null}
                </div>

                <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
                  Cloud sync pushes status to admin / WhatsApp when signed in.
                  {' '}<Link to="/inbox">Open inbox →</Link>
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </PageFade>
  )
}
