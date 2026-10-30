import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { Sync } from '../lib/sync'
import { PageFade, EmptyState } from '../components/ui'
import { openWhatsApp } from '../lib/share'
import { QUICK_REPLIES } from '../lib/waTemplates'

function urgencyToPriority(u) {
  const s = String(u || '').toLowerCase()
  if (s === 'urgent' || s === 'high') return 'urgent'
  if (s === 'low') return 'low'
  return 'normal'
}

export default function Inbox() {
  const { clients, company, refresh, toast } = useApp()
  const nav = useNavigate()
  const [pending, setPending] = useState([])
  const [intake, setIntake] = useState([])
  const [notifs, setNotifs] = useState([])
  const [busy, setBusy] = useState(false)
  const [replyFor, setReplyFor] = useState(null)
  const [replyText, setReplyText] = useState('')

  const load = useCallback(async () => {
    if (!Sync.isLoggedIn()) return
    try {
      const [p, n, t] = await Promise.all([
        Sync.getPendingWaClients().catch((e) => {
          console.warn('[Inbox] pending WA', e.message)
          return { clients: [], _error: e.message }
        }),
        Sync.getNotifications().catch(() => ({ notifications: [] })),
        Sync.getTicketIntake().catch((e) => {
          console.warn('[Inbox] ticket intake', e.message)
          return { tickets: [], _error: e.message }
        }),
      ])
      setPending(p.clients || [])
      setNotifs(n.notifications || [])
      setIntake(t.tickets || [])
    } catch (e) {
      toast?.(e.message || 'Could not load inbox', 'error')
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const openReply = (wa) => {
    setReplyFor(wa)
    const clientStub = { name: wa.name, phone: wa.phone }
    const first = QUICK_REPLIES[0]
    setReplyText(first.build(clientStub, company))
  }

  const applyQuick = (qr) => {
    if (!replyFor) return
    const clientStub = { name: replyFor.name, phone: replyFor.phone }
    setReplyText(qr.build(clientStub, company))
  }

  const sendReply = () => {
    if (!replyFor || !replyText.trim()) return toast?.('Enter a message', 'info')
    openWhatsApp(replyFor.phone, replyText)
    toast?.('Opening WhatsApp…', 'success')
    setReplyFor(null)
    setReplyText('')
  }

  const importClient = async (wa) => {
    setBusy(true)
    try {
      const phoneKey = String(wa.phone || '').replace(/\D/g, '')
      const exists = clients.find((c) => String(c.phone || '').replace(/\D/g, '') === phoneKey)

      // Optimistically remove from pending UI
      setPending((prev) => prev.filter((c) => String(c.phone || '').replace(/\D/g, '') !== phoneKey))

      if (exists) {
        await Sync.markWaClientImported(wa.phone, exists.id)
        toast('Already in clients', 'info')
      } else {
        const row = await db.add(STORES.clients, {
          name: wa.name || 'WhatsApp client',
          email: wa.email || '',
          phone: wa.phone || '',
          company: wa.company || '',
          address: [wa.address, wa.city].filter(Boolean).join(', '),
          category: 'walk_in',
          source: 'whatsapp',
          createdAt: new Date().toISOString(),
        })
        await Sync.markWaClientImported(wa.phone, row.id)
        await refresh()
        toast(`Imported ${wa.name || wa.phone}`, 'success')
      }
      load().catch(() => {})
    } catch (e) {
      toast(e.message || 'Import failed', 'error')
      load().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const importJob = async (job) => {
    setBusy(true)
    try {
      setIntake((prev) => prev.filter((j) => j.id !== job.id))

      let clientId = null
      const phoneKey = String(job.customer_phone || '').replace(/\D/g, '')
      if (phoneKey) {
        const exists = clients.find((c) => String(c.phone || '').replace(/\D/g, '') === phoneKey)
        if (exists) clientId = exists.id
        else {
          const row = await db.add(STORES.clients, {
            name: job.customer_name || 'WhatsApp client',
            phone: job.customer_phone || '',
            category: 'walk_in',
            source: 'whatsapp_job',
            createdAt: new Date().toISOString(),
          })
          clientId = row.id
          if (job.customer_phone) await Sync.markWaClientImported(job.customer_phone, row.id)
        }
      }

      const title = [job.device, job.issue].filter(Boolean).join(' — ') || 'WhatsApp job'
      const local = await db.add(STORES.tickets, {
        title,
        subject: title,
        description: job.issue || '',
        notes: `Imported from WhatsApp${job.source ? ` (${job.source})` : ''}`,
        contactName: job.customer_name || '',
        contactPhone: job.customer_phone || '',
        clientId,
        status: 'open',
        priority: urgencyToPriority(job.urgency),
        category: 'Other',
        supportType: 'remote',
        source: 'whatsapp_intake',
        intakeId: job.id,
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timerStatus: 'idle',
        timerAccumulatedMs: 0,
        system: 'classic',
      })

      await Sync.markTicketImported(job.id, local.id)
      await refresh()
      toast(`Job card created: ${title.slice(0, 40)}`, 'success')
      load().catch(() => {})
      return local
    } catch (e) {
      toast(e.message || 'Could not import job', 'error')
      load().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const importAllClients = async () => {
    for (const wa of pending) {
      // eslint-disable-next-line no-await-in-loop
      await importClient(wa)
    }
  }

  const importAllJobs = async () => {
    for (const job of intake) {
      // eslint-disable-next-line no-await-in-loop
      await importJob(job)
    }
    if (intake.length) nav('/tickets')
  }

  if (!Sync.isLoggedIn()) {
    return (
      <PageFade>
        <EmptyState
          title="Cloud login required"
          hint="Settings → Cloud → login so WhatsApp registrations and job cards sync here."
          action={<Link className="btn btn-primary" to="/settings">Open Settings</Link>}
        />
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp inbox</h1>
          <p className="subtitle">
            Pending clients ({pending.length}) · Job cards ({intake.length}) · Notifications
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={load}>Refresh</button>
          <button type="button" className="btn btn-primary" disabled={!pending.length || busy} onClick={importAllClients}>
            Import all clients
          </button>
          <button type="button" className="btn btn-secondary" disabled={!intake.length || busy} onClick={importAllJobs}>
            Import all jobs
          </button>
          <Link className="btn btn-outline" to="/clients">Clients</Link>
          <Link className="btn btn-outline" to="/tickets">Job cards</Link>
          <Link className="btn btn-outline" to="/wa-templates">Templates</Link>
        </div>
      </div>

      {replyFor ? (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--accent)' }}>
          <h3 style={{ marginTop: 0 }}>Reply to {replyFor.name || replyFor.phone}</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {QUICK_REPLIES.map((qr) => (
              <button key={qr.id} type="button" className="btn btn-outline btn-sm" onClick={() => applyQuick(qr)}>
                {qr.label}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={5}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type or pick a quick reply…"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-primary" onClick={sendReply}>Open WhatsApp</button>
            <button type="button" className="btn btn-outline" onClick={() => { setReplyFor(null); setReplyText('') }}>Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Pending WhatsApp clients ({pending.length})</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Registered on WhatsApp / web form — import adds them to your local Clients list. Reply opens WhatsApp with a pre-filled message.
        </p>
        {!pending.length && (
          <p className="muted">None pending. After a customer registers, they appear here.</p>
        )}
        {pending.map((wa) => (
          <div key={wa.phone || wa.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <strong>{wa.name || 'Unnamed'}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {[wa.phone, wa.email, wa.company].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => openReply(wa)}>
                Reply
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => importClient(wa)}>
                Import to clients
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>WhatsApp job cards to import ({intake.length})</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          These sit on the sync server until you import them into local Job cards.
        </p>
        {!intake.length && <p className="muted">No open intake jobs.</p>}
        {intake.map((job) => (
          <div key={job.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <strong>{job.device || 'Device'} — {job.issue || 'Issue'}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {[job.customer_name, job.customer_phone, job.urgency, job.status].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => importJob(job)}>
              Create job card
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent notifications</h3>
        {!notifs.length && <p className="muted">None yet.</p>}
        {notifs.slice(0, 20).map((n) => (
          <div key={n.id} className="list-card" style={{ opacity: n.read ? 0.7 : 1 }}>
            <strong style={{ fontSize: 14 }}>{n.title}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{n.body}</div>
            <div className="muted" style={{ fontSize: 11 }}>{String(n.created_at || '').slice(0, 19).replace('T', ' ')}</div>
          </div>
        ))}
      </div>
    </PageFade>
  )
}
