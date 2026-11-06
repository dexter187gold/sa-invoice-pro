import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { Sync } from '../lib/sync'
import { PageFade, EmptyState } from '../components/ui'
import { QUICK_REPLIES, suggestFromInbound } from '../lib/waTemplates'
import { suggestInboundReplies } from '../lib/whatsappResponder'
import { sendWhatsAppText, getWhatsAppConfigStatus } from '../lib/waBusiness'

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
  const [inboundText, setInboundText] = useState('')
  const [smartSuggestions, setSmartSuggestions] = useState([])
  const [waStatus, setWaStatus] = useState(null)

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

  useEffect(() => {
    load()
    getWhatsAppConfigStatus().then(setWaStatus).catch(() => setWaStatus({ configured: false, mode: 'wa.me fallback' }))
  }, [load])

  const openReply = (wa) => {
    setReplyFor(wa)
    const clientStub = { name: wa.name, phone: wa.phone }
    const first = QUICK_REPLIES[0]
    setReplyText(first.build(clientStub, company))
    setInboundText('')
    setSmartSuggestions([])
  }

  const applyQuick = (qr) => {
    if (!replyFor) return
    const clientStub = { name: replyFor.name, phone: replyFor.phone }
    setReplyText(qr.build(clientStub, company))
  }

  const doSmartSuggest = () => {
    if (!replyFor) return
    const clientStub = { name: replyFor.name, phone: replyFor.phone }
    const suggestions = suggestInboundReplies({
      message: inboundText,
      client: clientStub,
      company,
    })
    setSmartSuggestions(suggestions)
    if (suggestions.length) {
      setReplyText(suggestions[0].text)
      toast?.(`Suggested ${suggestions.length} reply option${suggestions.length > 1 ? 's' : ''}`, 'info')
    } else {
      const id = suggestFromInbound(inboundText)
      const qr = QUICK_REPLIES.find((q) => q.id === id) || QUICK_REPLIES[0]
      setReplyText(qr.build(clientStub, company))
      toast?.(`Suggested: ${qr.label}`, 'info')
    }
  }

  const applySuggestion = (sug, lang = 'en') => {
    setReplyText(lang === 'af' && sug.af ? sug.af : sug.text)
  }

  const sendReply = async () => {
    if (!replyFor || !replyText.trim()) return toast?.('Enter a message', 'info')
    setBusy(true)
    try {
      const result = await sendWhatsAppText({ to: replyFor.phone, body: replyText })
      if (result.channel === 'cloud') {
        toast?.('Sent via WhatsApp Cloud API', 'success')
      } else {
        toast?.('Opening WhatsApp…', 'success')
      }
      setReplyFor(null)
      setReplyText('')
      setInboundText('')
      setSmartSuggestions([])
    } catch (e) {
      toast?.(e.message || 'Could not send', 'error')
    } finally {
      setBusy(false)
    }
  }

  const importClient = async (wa) => {
    setBusy(true)
    try {
      const phoneKey = String(wa.phone || '').replace(/\D/g, '')
      const exists = clients.find((c) => String(c.phone || '').replace(/\D/g, '') === phoneKey)

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
      await importClient(wa)
    }
  }

  const importAllJobs = async () => {
    for (const job of intake) {
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

  const sendLabel = waStatus?.configured ? 'Send (Cloud)' : 'Open WhatsApp'

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp inbox</h1>
          <p className="subtitle">
            Pending clients ({pending.length}) · Job cards ({intake.length}) · Notifications
            {waStatus ? ` · ${waStatus.mode}` : ''}
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

          <label className="stack" style={{ gap: 4, marginBottom: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>Paste inbound message — Smart suggest builds ZA-tone replies (EN + AF)</span>
            <textarea
              className="input"
              rows={3}
              value={inboundText}
              onChange={(e) => setInboundText(e.target.value)}
              placeholder="Paste the client's WhatsApp message here…"
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={doSmartSuggest} disabled={!inboundText.trim()}>
              Smart suggest
            </button>
          </label>

          {smartSuggestions.length > 0 && (
            <div style={{ marginBottom: 12, padding: 8, background: 'var(--surface-2)', borderRadius: 6 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Contextual suggestions</div>
              {smartSuggestions.map((sug, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 120 }}>{sug.label}</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => applySuggestion(sug, 'en')}>Use EN</button>
                  {sug.af && <button type="button" className="btn btn-outline btn-sm" onClick={() => applySuggestion(sug, 'af')}>Use AF</button>}
                </div>
              ))}
            </div>
          )}

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
            <button type="button" className="btn btn-primary" disabled={busy} onClick={sendReply}>{sendLabel}</button>
            <button type="button" className="btn btn-outline" onClick={() => { setReplyFor(null); setReplyText(''); setInboundText(''); setSmartSuggestions([]) }}>Cancel</button>
          </div>
          {waStatus && !waStatus.configured ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Cloud API not configured — opens wa.me. Add Meta token + phone ID in Dev portal to send from the desk.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Pending WhatsApp clients ({pending.length})</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Registered on WhatsApp / web form — import adds them to your local Clients list. Reply sends via Cloud when configured, else opens WhatsApp.
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
