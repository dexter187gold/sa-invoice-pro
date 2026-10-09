import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'

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

const DEFAULT_RATES = { onsite: 450, remote: 300 }

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function currentElapsedMs(t) {
  if (!t) return 0
  const acc = Number(t.timerAccumulatedMs) || 0
  if (t.timerStatus === 'running' && t.timerStartedAt) {
    return acc + (Date.now() - new Date(t.timerStartedAt).getTime())
  }
  return acc
}

function supportLabel(type) {
  return type === 'onsite' ? 'Onsite support' : 'Remote support'
}

export default function Tickets() {
  const { toast, company, timeEntries, invoices, vatRate, vatEnabled, refresh } = useApp()
  const nav = useNavigate()
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [view, setView] = useState('list')
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    status: 'open',
    priority: 'normal',
    notes: '',
    supportType: 'remote',
  })
  const [tick, setTick] = useState(0)
  const [manualMinutes, setManualMinutes] = useState('60')
  const [manualNote, setManualNote] = useState('')
  const [manualBillable, setManualBillable] = useState(true)
  const [rates, setRates] = useState(DEFAULT_RATES)
  const [convertOpen, setConvertOpen] = useState(null) // ticket object
  const [convertType, setConvertType] = useState('remote')
  const [convertIncludeTimer, setConvertIncludeTimer] = useState(true)
  const [convertBusy, setConvertBusy] = useState(false)

  const load = useCallback(async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
    setClients((await db.getAll(STORES.clients)) || [])
    const saved = await db.getSetting('supportRates', null)
    if (saved && typeof saved === 'object') {
      setRates({
        onsite: Number(saved.onsite) || DEFAULT_RATES.onsite,
        remote: Number(saved.remote) || DEFAULT_RATES.remote,
      })
    }
    if (refresh) await refresh()
  }, [refresh])

  useEffect(() => {
    load()
    try { localStorage.setItem('sa_ticket_mode', 'classic') } catch (e) {}
  }, [load])

  useEffect(() => {
    const anyRunning = (tickets || []).some((t) => t.timerStatus === 'running')
    if (!anyRunning) return undefined
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [tickets])

  const list = useMemo(() => {
    let rows = (tickets || []).filter((t) => !t.parentId)
    const qq = q.trim().toLowerCase()
    if (qq) {
      rows = rows.filter((t) => {
        const c = clients.find((x) => String(x.id) === String(t.clientId))
        return [t.title, t.subject, t.notes, t.status, c?.name, t.supportType].join(' ').toLowerCase().includes(qq)
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

  const entriesFor = useCallback(
    (ticketId) =>
      (timeEntries || [])
        .filter((e) => String(e.ticketId) === String(ticketId))
        .sort((a, b) => String(b.at || b.createdAt || '').localeCompare(String(a.at || a.createdAt || ''))),
    [timeEntries],
  )

  const billableMinutesFor = useCallback(
    (ticketId) =>
      entriesFor(ticketId)
        .filter((e) => e.billable !== false && !e.invoiced)
        .reduce((s, e) => s + (Number(e.minutes) || 0), 0),
    [entriesFor],
  )

  const totalMinutesFor = useCallback(
    (ticketId) => entriesFor(ticketId).reduce((s, e) => s + (Number(e.minutes) || 0), 0),
    [entriesFor],
  )

  const rateFor = (type) => (type === 'onsite' ? rates.onsite : rates.remote)

  const openNew = () => {
    setForm({ title: '', clientId: '', status: 'open', priority: 'normal', notes: '', supportType: 'remote' })
    setEditing('new')
  }

  const openEdit = (t) => {
    setForm({
      title: t.title || t.subject || '',
      clientId: t.clientId ? String(t.clientId) : '',
      status: t.status || 'open',
      priority: t.priority || 'normal',
      notes: t.notes || t.description || '',
      supportType: t.supportType === 'onsite' ? 'onsite' : 'remote',
    })
    setManualMinutes('60')
    setManualNote('')
    setManualBillable(true)
    setEditing(t)
  }

  const saveRates = async (next) => {
    setRates(next)
    await db.setSetting('supportRates', next)
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
      supportType: form.supportType === 'onsite' ? 'onsite' : 'remote',
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
          timerStatus: 'idle',
          timerAccumulatedMs: 0,
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

  const pauseOthers = async (exceptId) => {
    const all = (await db.getAll(STORES.tickets)) || []
    for (const t of all) {
      if (String(t.id) === String(exceptId)) continue
      if (t.timerStatus !== 'running') continue
      const acc = currentElapsedMs(t)
      await db.put(STORES.tickets, {
        ...t,
        timerStatus: 'paused',
        timerAccumulatedMs: acc,
        timerStartedAt: null,
        timerPausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  const startTimer = async (t) => {
    try {
      await pauseOthers(t.id)
      const acc = currentElapsedMs(t)
      const next = {
        ...t,
        timerStatus: 'running',
        timerStartedAt: new Date().toISOString(),
        timerAccumulatedMs: acc,
        timerPausedAt: null,
        status: t.status === 'open' || !t.status ? 'in_progress' : t.status,
        updatedAt: new Date().toISOString(),
      }
      await db.put(STORES.tickets, next)
      await load()
      toast('Timer started', 'success')
    } catch (err) {
      toast(err.message || 'Could not start timer', 'error')
    }
  }

  const pauseTimer = async (t) => {
    try {
      if (t.timerStatus !== 'running') return
      const acc = currentElapsedMs(t)
      await db.put(STORES.tickets, {
        ...t,
        timerStatus: 'paused',
        timerAccumulatedMs: acc,
        timerStartedAt: null,
        timerPausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await load()
      toast('Timer paused', 'success')
    } catch (err) {
      toast(err.message || 'Could not pause', 'error')
    }
  }

  const resumeTimer = async (t) => {
    try {
      await pauseOthers(t.id)
      await db.put(STORES.tickets, {
        ...t,
        timerStatus: 'running',
        timerStartedAt: new Date().toISOString(),
        timerPausedAt: null,
        status: t.status === 'open' || !t.status ? 'in_progress' : t.status,
        updatedAt: new Date().toISOString(),
      })
      await load()
      toast('Timer resumed', 'success')
    } catch (err) {
      toast(err.message || 'Could not resume', 'error')
    }
  }

  const stopTimer = async (t, { log = true } = {}) => {
    try {
      const ms = currentElapsedMs(t)
      const minutes = Math.max(1, Math.round(ms / 60000)) || 1
      const cleared = {
        ...t,
        timerStatus: 'idle',
        timerAccumulatedMs: 0,
        timerStartedAt: null,
        timerPausedAt: null,
        updatedAt: new Date().toISOString(),
      }
      await db.put(STORES.tickets, cleared)
      if (log && ms > 0) {
        await db.add(STORES.timeEntries, {
          ticketId: t.id,
          minutes,
          note: 'Timer stop',
          billable: true,
          at: new Date().toISOString(),
          source: 'timer',
        })
        toast(`Stopped · logged ${minutes} min`, 'success')
      } else {
        toast('Timer stopped', 'success')
      }
      await load()
      if (editing && editing !== 'new' && String(editing.id) === String(t.id)) {
        setEditing({ ...cleared })
      }
    } catch (err) {
      toast(err.message || 'Could not stop timer', 'error')
    }
  }

  const logManualTime = async (ticketId) => {
    const minutes = parseInt(manualMinutes, 10) || 0
    if (minutes <= 0) return toast('Enter minutes', 'error')
    try {
      await db.add(STORES.timeEntries, {
        ticketId,
        minutes,
        note: manualNote || '',
        billable: !!manualBillable,
        at: new Date().toISOString(),
        source: 'manual',
      })
      setManualMinutes('60')
      setManualNote('')
      toast('Time logged', 'success')
      await load()
    } catch (err) {
      toast(err.message || 'Log failed', 'error')
    }
  }

  const openConvert = (t) => {
    setConvertType(t.supportType === 'onsite' ? 'onsite' : 'remote')
    setConvertIncludeTimer(true)
    setConvertOpen(t)
  }

  const convertPreview = useMemo(() => {
    if (!convertOpen) return null
    const t = convertOpen
    let minutes = billableMinutesFor(t.id)
    let timerExtra = 0
    if (convertIncludeTimer && (t.timerStatus === 'running' || t.timerStatus === 'paused')) {
      timerExtra = Math.max(0, Math.round(currentElapsedMs(t) / 60000))
      minutes += timerExtra
    }
    if (minutes < 1) minutes = 0
    const hours = Math.round((minutes / 60) * 100) / 100
    const rate = rateFor(convertType)
    const exclusive = hours * rate
    const vat = vatEnabled ? exclusive * (Number(vatRate) || 0.15) : 0
    return { minutes, timerExtra, hours, rate, exclusive, vat, total: exclusive + vat }
  }, [convertOpen, convertType, convertIncludeTimer, billableMinutesFor, rates, vatEnabled, vatRate, tick])

  const doConvertToInvoice = async () => {
    const t = convertOpen
    if (!t) return
    if (!t.clientId) return toast('Assign a client to this ticket first', 'error')
    const preview = convertPreview
    if (!preview || preview.hours <= 0) return toast('No billable time to invoice', 'error')

    setConvertBusy(true)
    try {
      // If timer still running/paused and included, stop & log first
      let ticket = t
      if (convertIncludeTimer && (t.timerStatus === 'running' || t.timerStatus === 'paused')) {
        const ms = currentElapsedMs(t)
        const minutes = Math.max(1, Math.round(ms / 60000)) || 1
        const cleared = {
          ...t,
          timerStatus: 'idle',
          timerAccumulatedMs: 0,
          timerStartedAt: null,
          timerPausedAt: null,
          updatedAt: new Date().toISOString(),
        }
        await db.put(STORES.tickets, cleared)
        if (ms > 0) {
          await db.add(STORES.timeEntries, {
            ticketId: t.id,
            minutes,
            note: 'Timer stop (invoice convert)',
            billable: true,
            at: new Date().toISOString(),
            source: 'timer',
          })
        }
        ticket = cleared
      }

      const allEntries = ((await db.getAll(STORES.timeEntries)) || []).filter(
        (e) => String(e.ticketId) === String(t.id) && e.billable !== false && !e.invoiced,
      )
      const totalMins = allEntries.reduce((s, e) => s + (Number(e.minutes) || 0), 0)
      const hours = Math.round((totalMins / 60) * 100) / 100
      if (hours <= 0) {
        toast('No billable time to invoice', 'error')
        setConvertBusy(false)
        return
      }

      const st = convertType === 'onsite' ? 'onsite' : 'remote'
      const rate = rateFor(st)
      const label = supportLabel(st)
      const desc = `${label} — ${t.title || t.subject || 'Job'} (${totalMins} min / ${hours} h @ R${rate}/h)`

      const lines = [{ description: desc, qty: hours, price: rate }]
      const totals = invoiceTotals(lines, vatRate, vatEnabled)
      const year = new Date().getFullYear()
      const invList = (await db.getAll(STORES.invoices)) || []
      const number = `INV-${year}-${String(invList.length + 1).padStart(4, '0')}`
      const today = new Date().toISOString().slice(0, 10)
      const due = new Date()
      due.setDate(due.getDate() + 7)

      const inv = await db.add(STORES.invoices, {
        clientId: t.clientId,
        number,
        date: today,
        dueDate: due.toISOString().slice(0, 10),
        status: 'unpaid',
        notes: `From job card: ${t.title || t.subject || t.id}\n${t.notes || ''}`.trim(),
        serviceType: label,
        ticketId: t.id,
        lines,
        exclusive: totals.exclusive,
        vatAmount: totals.vat,
        total: totals.total,
        amountPaid: 0,
        amountDue: totals.total,
        companyName: company?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      for (const e of allEntries) {
        await db.put(STORES.timeEntries, { ...e, invoiced: true, invoiceId: inv.id })
      }

      await db.put(STORES.tickets, {
        ...ticket,
        supportType: st,
        invoiceId: inv.id,
        invoiceNumber: number,
        status: ticket.status === 'closed' ? 'closed' : 'resolved',
        updatedAt: new Date().toISOString(),
      })

      await load()
      setConvertOpen(null)
      setEditing(null)
      toast(`Invoice ${number} created · ${formatMoney(totals.total)}`, 'success')
      nav(`/invoices/${inv.id}`)
    } catch (err) {
      toast(err.message || 'Convert failed', 'error')
    } finally {
      setConvertBusy(false)
    }
  }

  void tick

  const timerControls = (t) => {
    const status = t.timerStatus || 'idle'
    const elapsed = formatElapsed(currentElapsedMs(t))
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {(status === 'running' || status === 'paused') && (
          <span
            className="badge"
            style={{
              fontVariantNumeric: 'tabular-nums',
              background: status === 'running' ? 'var(--green, #16a34a)' : '#ca8a04',
              color: '#fff',
            }}
            title={status === 'running' ? 'Timer running' : 'Timer paused'}
          >
            {status === 'running' ? '● ' : '❚❚ '}{elapsed}
          </span>
        )}
        {status === 'idle' && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => startTimer(t)}>Start timer</button>
        )}
        {status === 'running' && (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => pauseTimer(t)}>Pause</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => stopTimer(t)}>Stop & log</button>
          </>
        )}
        {status === 'paused' && (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => resumeTimer(t)}>Resume</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => stopTimer(t)}>Stop & log</button>
          </>
        )}
      </div>
    )
  }

  const card = (t) => {
    const c = clients.find((x) => String(x.id) === String(t.clientId))
    const mins = totalMinutesFor(t.id)
    const billMins = billableMinutesFor(t.id)
    const st = t.supportType === 'onsite' ? 'onsite' : 'remote'
    return (
      <div key={t.id} className="list-card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <strong>{t.title || t.subject || 'Ticket'}</strong>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              <span className="badge">{t.status || 'open'}</span>{' '}
              <span className="badge warn">{t.priority || 'normal'}</span>{' '}
              <span className="badge">{st === 'onsite' ? 'Onsite R' + rates.onsite : 'Remote R' + rates.remote}/h</span>
              {c ? ` · ${c.name}` : ''}
              {mins > 0 ? ` · ${mins} min logged` : ''}
              {billMins > 0 && billMins !== mins ? ` (${billMins} billable)` : ''}
              {t.invoiceNumber ? ` · ${t.invoiceNumber}` : ''}
            </div>
            <div style={{ marginTop: 6 }}>{timerControls(t)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Open</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openConvert(t)}>To invoice</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setStatus(t, 'in_progress')}>In progress</button>
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
          <h1 style={{ margin: 0 }}>Tickets · Job cards</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Timer · log time · convert to invoice (Onsite R{rates.onsite}/h · Remote R{rates.remote}/h)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button type="button" className={`btn btn-sm ${view === 'board' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('board')}>Board</button>
          <button type="button" className="btn btn-primary" onClick={openNew}>New ticket</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Hourly rates</span>
        <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
          Onsite R
          <input
            className="input"
            style={{ width: 88 }}
            type="number"
            min={0}
            step={1}
            value={rates.onsite}
            onChange={(e) => saveRates({ ...rates, onsite: Number(e.target.value) || 0 })}
          />
          /h
        </label>
        <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
          Remote R
          <input
            className="input"
            style={{ width: 88 }}
            type="number"
            min={0}
            step={1}
            value={rates.remote}
            onChange={(e) => saveRates({ ...rates, remote: Number(e.target.value) || 0 })}
          />
          /h
        </label>
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
              No tickets yet. Click <strong>New ticket</strong> to log a job, track time, then <strong>To invoice</strong>.
            </div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editing === 'new' ? 'New ticket' : 'Edit ticket'}</h2>
            <form className="form-grid" onSubmit={save}>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <label className="label">Client</label>
              <select className="select" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">—</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
                <div>
                  <label className="label">Support type</label>
                  <select className="select" value={form.supportType} onChange={(e) => setForm({ ...form, supportType: e.target.value })}>
                    <option value="remote">Remote (R{rates.remote}/h)</option>
                    <option value="onsite">Onsite (R{rates.onsite}/h)</option>
                  </select>
                </div>
              </div>
              <label className="label">Details</label>
              <textarea className="input" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              {editing !== 'new' && editing.id != null && (
                <div style={{ marginTop: 8, padding: 12, background: 'var(--surface-2, #f1f5f9)', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Job timer</div>
                  {timerControls(editing)}
                  <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13 }}>Log time (manual)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 8, marginTop: 6, alignItems: 'end' }}>
                    <div>
                      <label className="label">Minutes</label>
                      <input className="input" type="number" min={1} value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Note</label>
                      <input className="input" value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Optional" />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => logManualTime(editing.id)}>Log</button>
                  </div>
                  <label className="muted" style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                    <input type="checkbox" checked={manualBillable} onChange={(e) => setManualBillable(e.target.checked)} /> Billable
                  </label>
                  {entriesFor(editing.id).length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Time entries · total {totalMinutesFor(editing.id)} min · unbilled billable {billableMinutesFor(editing.id)} min
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {entriesFor(editing.id).slice(0, 12).map((e) => (
                          <li key={e.id}>
                            {e.minutes} min{e.billable === false ? ' · non-billable' : e.invoiced ? ' · invoiced' : ' · billable'}
                            {e.note ? ` — ${e.note}` : ''}
                            <span className="muted"> · {(e.at || e.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <button type="button" className="btn btn-primary" onClick={() => openConvert(editing)}>
                      Convert to invoice
                    </button>
                    {editing.invoiceId && (
                      <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => nav(`/invoices/${editing.invoiceId}`)}>
                        Open {editing.invoiceNumber || 'invoice'}
                      </button>
                    )}
                  </div>
                </div>
              )}

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

      {convertOpen && convertPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => !convertBusy && setConvertOpen(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Convert to invoice</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {convertOpen.title || convertOpen.subject || 'Job'} · unbilled billable time → line item
            </p>
            <label className="label">Support type (rate)</label>
            <select className="select" value={convertType} onChange={(e) => setConvertType(e.target.value)}>
              <option value="remote">Remote support — R{rates.remote}/hour</option>
              <option value="onsite">Onsite support — R{rates.onsite}/hour</option>
            </select>
            {(convertOpen.timerStatus === 'running' || convertOpen.timerStatus === 'paused') && (
              <label className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>
                <input type="checkbox" checked={convertIncludeTimer} onChange={(e) => setConvertIncludeTimer(e.target.checked)} />
                Include active timer ({formatElapsed(currentElapsedMs(convertOpen))}) and stop it
              </label>
            )}
            <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2, #f1f5f9)', borderRadius: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Billable minutes</span><strong>{convertPreview.minutes}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hours (qty)</span><strong>{convertPreview.hours}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rate</span><strong>R{convertPreview.rate}/h</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Exclusive</span><strong>{formatMoney(convertPreview.exclusive)}</strong></div>
              {vatEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VAT</span><strong>{formatMoney(convertPreview.vat)}</strong></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 16 }}><span>Total</span><strong>{formatMoney(convertPreview.total)}</strong></div>
            </div>
            {!convertOpen.clientId && (
              <p style={{ color: '#b91c1c', fontSize: 13 }}>This ticket has no client — assign one before converting.</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" disabled={convertBusy || !convertOpen.clientId || convertPreview.hours <= 0} onClick={doConvertToInvoice}>
                {convertBusy ? 'Creating…' : 'Create invoice'}
              </button>
              <button type="button" className="btn btn-outline" disabled={convertBusy} onClick={() => setConvertOpen(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
