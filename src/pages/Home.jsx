import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import { StatusBadge, PageFade, EmptyState } from '../components/ui'
import { openWhatsApp, buildQuoteAcceptedFollowUp, buildQuoteDeclinedFollowUp } from '../lib/share'
import { monthCashSnapshot } from '../lib/documentActions'
import { APP_VERSION } from '../config'
import { buildCollectionRing } from '../lib/collectionRing'
import { cashForecast } from '../lib/forecast'
import { isLoadSheddingMode } from '../lib/loadShedding'
import { shareJobHologram } from '../lib/jobHologram'
import {
  acceptedQuotesAwaitingConvert,
  declinedQuotesRecent,
  deskNextActions,
  jobsPastPromise,
} from '../lib/deskPulse'
import OnboardingChecklist from '../components/OnboardingChecklist'
import PhaseBoard from '../components/PhaseBoard'
import DeskRulesCard from '../components/DeskRulesCard'
import NpsCard from '../components/NpsCard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function daysPastDue(inv) {
  const d = inv.dueDate || inv.date
  if (!d) return 0
  const ms = Date.now() - new Date(d).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

export default function Home() {
  const nav = useNavigate()
  const { company, invoices, clients, tickets, quotes, payments, expenses, toast } = useApp()
  const [focus, setFocus] = useState('all')
  const shedding = isLoadSheddingMode()

  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const paid = invoices.filter((i) => i.status === 'paid')
  const ar = open.reduce((s, i) => s + (Number(i.amountDue != null ? i.amountDue : i.total) || 0), 0)
  const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const paidToday = payments
    .filter((p) => String(p.date || '').slice(0, 10) === today)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const openJobs = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const collectionRate = rev + ar > 0 ? Math.round((rev / (rev + ar)) * 100) : 100
  const monthSnap = useMemo(() => monthCashSnapshot({ invoices, expenses, payments }), [invoices, expenses, payments])
  const forecast = useMemo(() => cashForecast(invoices), [invoices])
  const ring = useMemo(() => buildCollectionRing(tickets, clients), [tickets, clients])
  const isNew = !clients.length && !invoices.length

  const acceptQueue = useMemo(() => acceptedQuotesAwaitingConvert(quotes).slice(0, 5), [quotes])
  const declinedRecent = useMemo(() => declinedQuotesRecent(quotes).slice(0, 3), [quotes])
  const slaJobs = useMemo(() => jobsPastPromise(tickets).slice(0, 5), [tickets])
  const nextActions = useMemo(
    () => deskNextActions({ quotes, tickets, invoices }),
    [quotes, tickets, invoices],
  )

  const needsChase = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      if (!['overdue', 'partial', 'unpaid'].includes(inv.status || '')) continue
      const id = String(inv.clientId)
      if (!map[id]) map[id] = { clientId: id, total: 0, count: 0, worstDays: 0 }
      map[id].total += Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0
      map[id].count++
      map[id].worstDays = Math.max(map[id].worstDays, daysPastDue(inv))
    }
    return Object.values(map)
      .map((row) => ({ ...row, client: clients.find((c) => String(c.id) === row.clientId) }))
      .filter((r) => r.client)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [invoices, clients])

  const jobToBill = useMemo(() => {
    return openJobs
      .filter((t) => !t.invoiceId && (t.status === 'done' || t.status === 'resolved' || t.billable))
      .slice(0, 5)
  }, [openJobs])

  const chaseWhatsApp = (client, total, count) => {
    const phone = String(client?.phone || '').replace(/\D/g, '')
    if (!phone) {
      toast?.('No phone on client — add one first', 'error')
      return
    }
    const name = client.name?.split(' ')[0] || 'there'
    const text =
      `Hi ${name}, hope you are well. Friendly reminder from ${company?.name || 'us'}: ` +
      `${count} open invoice${count > 1 ? 's' : ''} · balance ${formatMoney(total)}. ` +
      `Please settle when you can — reply here if you need the PDF or banking details. Thank you!`
    openWhatsApp(phone, text)
  }

  const notifyCollection = async (row) => {
    const t = tickets.find((x) => String(x.id) === String(row.id))
    if (!t) return
    try {
      await shareJobHologram(t, company, row.phone)
      toast?.(row.phone ? 'Opening collection WhatsApp…' : 'Status card copied', 'success')
    } catch (e) {
      toast?.(e?.message || 'Share failed', 'error')
    }
  }

  const thankAccepted = (qt) => {
    const client = clients.find((c) => String(c.id) === String(qt.clientId))
    const text = buildQuoteAcceptedFollowUp(qt, client, company)
    const ok = openWhatsApp(client?.phone, text)
    toast?.(ok ? 'WhatsApp thank-you…' : 'Add phone on client to send', ok ? 'success' : 'info')
  }

  const followDeclined = (qt) => {
    const client = clients.find((c) => String(c.id) === String(qt.clientId))
    const text = buildQuoteDeclinedFollowUp(qt, client, company)
    const ok = openWhatsApp(client?.phone, text)
    toast?.(ok ? 'WhatsApp follow-up…' : 'Add phone on client', ok ? 'success' : 'info')
  }

  const ringStyle = {
    background: `conic-gradient(var(--green, #22c55e) ${collectionRate * 3.6}deg, var(--border, #333) 0)`,
  }

  const showMoney = focus === 'all' || focus === 'money'
  const showJobs = focus === 'all' || focus === 'jobs'

  return (
    <PageFade>
      <OnboardingChecklist />
      <PhaseBoard compact />
      <DeskRulesCard invoices={invoices} tickets={tickets} clients={clients} />
      <NpsCard clients={clients} toast={toast} />

      {shedding ? (
        <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #fbbf24' }}>
          <strong>Load-shedding mode on</strong>
          <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>Outbound messages can be queued — Settings → Data</span>
        </div>
      ) : null}

      {nextActions.length > 0 && (
        <div className="card" style={{ marginBottom: 12, padding: '12px 14px' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Do next</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {nextActions.map((a) => (
              <Link
                key={a.id}
                to={a.href}
                className="btn btn-sm"
                style={{
                  borderLeft: a.tone === 'good' ? '3px solid #22c55e' : a.tone === 'warn' ? '3px solid #f59e0b' : '3px solid #64748b',
                }}
              >
                {a.title}
              </Link>
            ))}
            <Link className="btn btn-outline btn-sm" to="/quotes">Quotes · pull cloud decisions</Link>
          </div>
        </div>
      )}

      <section className="pulse-hero">
        <div className="pulse-hero-text">
          <p className="pulse-kicker">{greeting()}</p>
          <h1 className="pulse-title">{company?.name || 'SA Invoice Pro'}</h1>
          <p className="pulse-sub">Field desk · v{APP_VERSION}</p>
        </div>
        <div className="pulse-ring-wrap" title="Collection rate">
          <div className="pulse-ring" style={ringStyle}>
            <div className="pulse-ring-inner">
              <strong>{collectionRate}%</strong>
              <span>collected</span>
            </div>
          </div>
        </div>
      </section>

      <div className="pulse-focus">
        {[
          { id: 'all', label: 'Everything' },
          { id: 'money', label: 'Money' },
          { id: 'jobs', label: 'Jobs' },
        ].map((f) => (
          <button key={f.id} type="button" className={`pulse-chip ${focus === f.id ? 'on' : ''}`} onClick={() => setFocus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="pulse-stats">
        <button type="button" className="pulse-stat" onClick={() => nav('/invoices?status=overdue')}>
          <span className="pulse-stat-k">Open AR</span>
          <span className="pulse-stat-v warn">{formatMoney(ar)}</span>
          <span className="pulse-stat-h">{open.length} invoices</span>
        </button>
        <button type="button" className="pulse-stat" onClick={() => nav('/payments')}>
          <span className="pulse-stat-k">Paid today</span>
          <span className="pulse-stat-v good">{formatMoney(paidToday)}</span>
          <span className="pulse-stat-h">Month {formatMoney(monthSnap?.in || 0)}</span>
        </button>
        <button type="button" className="pulse-stat" onClick={() => nav('/tickets')}>
          <span className="pulse-stat-k">Open jobs</span>
          <span className="pulse-stat-v">{openJobs.length}</span>
          <span className="pulse-stat-h">{jobToBill.length} ready to bill</span>
        </button>
        <button type="button" className="pulse-stat" onClick={() => nav('/quotes')}>
          <span className="pulse-stat-k">Portal accepts</span>
          <span className="pulse-stat-v good">{acceptQueue.length}</span>
          <span className="pulse-stat-h">To convert</span>
        </button>
      </div>

      <div className="pulse-actions">
        <Link className="pulse-action primary" to="/invoices/new">＋ Invoice</Link>
        <Link className="pulse-action" to="/tickets">＋ Job card</Link>
        <Link className="pulse-action" to="/quotes">＋ Quote</Link>
        <Link className="pulse-action" to="/clients">Clients</Link>
      </div>

      {isNew && (
        <div className="pulse-empty card">
          <EmptyState
            title="Your desk is clear — in a good way"
            description="Add a client, drop a job or raise the first tax invoice."
            action={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link className="btn btn-primary" to="/clients">Add client</Link>
                <Link className="btn btn-outline" to="/invoices/new">First invoice</Link>
              </div>
            }
          />
        </div>
      )}

      {acceptQueue.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Client accepted — convert</h2>
            <span className="muted">Portal / desk</span>
          </div>
          <div className="pulse-chase">
            {acceptQueue.map((qt) => {
              const c = clients.find((x) => String(x.id) === String(qt.clientId))
              return (
                <div key={qt.id} className="pulse-chase-card">
                  <div>
                    <strong>{qt.number || 'Quote'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c?.name || 'Client'} · {formatMoney(qt.total)}
                      {qt.portalNote ? ` · “${String(qt.portalNote).slice(0, 40)}”` : ''}
                    </div>
                  </div>
                  <div className="pulse-chase-btns">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => thankAccepted(qt)}>WA thank</button>
                    <Link className="btn btn-primary btn-sm" to="/quotes">Convert</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {declinedRecent.length > 0 && showMoney && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Declined recently</h2>
            <span className="muted">Optional follow-up</span>
          </div>
          <div className="pulse-chase">
            {declinedRecent.map((qt) => {
              const c = clients.find((x) => String(x.id) === String(qt.clientId))
              return (
                <div key={qt.id} className="pulse-chase-card">
                  <div>
                    <strong>{qt.number || 'Quote'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{c?.name || 'Client'} · {formatMoney(qt.total)}</div>
                  </div>
                  <div className="pulse-chase-btns">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => followDeclined(qt)}>WA revise?</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showJobs && slaJobs.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Past promised date</h2>
            <Link to="/tickets" className="btn btn-outline btn-sm">Desk</Link>
          </div>
          <div className="pulse-jobs">
            {slaJobs.map((t) => {
              const c = clients.find((x) => String(x.id) === String(t.clientId))
              return (
                <div key={t.id} className="pulse-job-card">
                  <div>
                    <strong>{t.title || t.number || 'Job'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c?.name || '—'} · promised {String(t.promisedAt || t.dueDate || t.slaDue || '').slice(0, 10)}
                    </div>
                  </div>
                  <Link className="btn btn-primary btn-sm" to="/tickets">Open</Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showJobs && ring.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Collection ring</h2>
            <span className="muted">Waiting in-store / ready</span>
          </div>
          <div className="pulse-chase">
            {ring.map((row) => (
              <div key={row.id} className="pulse-chase-card">
                <div>
                  <strong>{row.title}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {row.clientName} · {row.waitHrs}h · {row.urgency}
                  </div>
                </div>
                <div className="pulse-chase-btns">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => notifyCollection(row)}>Notify WA</button>
                  <Link className="btn btn-outline btn-sm" to="/tickets">Desk</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showMoney && needsChase.length > 0 && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Chase list</h2>
            <span className="muted">WhatsApp-first</span>
          </div>
          <div className="pulse-chase">
            {needsChase.map((row) => (
              <div key={row.clientId} className="pulse-chase-card">
                <div>
                  <strong>{row.client.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {row.count} open · {formatMoney(row.total)}
                    {row.worstDays ? ` · ${row.worstDays}d` : ''}
                  </div>
                </div>
                <div className="pulse-chase-btns">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => chaseWhatsApp(row.client, row.total, row.count)}>WhatsApp</button>
                  <Link className="btn btn-outline btn-sm" to="/invoices?status=overdue">View</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showJobs && (jobToBill.length > 0 || openJobs.length > 0) && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Jobs pulse</h2>
            <Link to="/tickets" className="btn btn-outline btn-sm">Board</Link>
          </div>
          {jobToBill.length > 0 ? (
            <div className="pulse-jobs">
              {jobToBill.map((t) => {
                const c = clients.find((x) => String(x.id) === String(t.clientId))
                return (
                  <div key={t.id} className="pulse-job-card">
                    <div>
                      <strong>{t.title || t.number || 'Job'}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>{c?.name || 'No client'} · {t.status}</div>
                    </div>
                    <Link className="btn btn-primary btn-sm" to={`/invoices/new?ticket=${t.id}`}>Bill</Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>{openJobs.length} open · mark done to bill fast</p>
          )}
        </section>
      )}

      {showMoney && (
        <section className="pulse-section">
          <div className="pulse-section-head">
            <h2>Recent money</h2>
            <Link to="/invoices" className="btn btn-outline btn-sm">All invoices</Link>
          </div>
          <div className="pulse-list">
            {[...invoices].slice(-6).reverse().map((inv) => {
              const client = clients.find((c) => String(c.id) === String(inv.clientId))
              return (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="pulse-list-row">
                  <div>
                    <strong>{inv.number || 'Invoice'}</strong>
                    <span className="muted"> · {client?.name || '—'}</span>
                  </div>
                  <div className="pulse-list-right">
                    <StatusBadge status={inv.status || 'unpaid'} />
                    <strong>{formatMoney(inv.amountDue != null ? inv.amountDue : inv.total)}</strong>
                  </div>
                </Link>
              )
            })}
            {!invoices.length && <p className="muted">No invoices yet</p>}
          </div>
        </section>
      )}
    </PageFade>
  )
}
