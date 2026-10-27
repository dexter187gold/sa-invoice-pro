import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/money'
import {
  extractPortalToken,
  fetchPortalView,
  submitPortalQuoteDecision,
  canDecideQuote,
  normalizeQuoteStatus,
  portalQuoteSummary,
} from '../lib/portalQuote'
import { APP_VERSION, APP_NAME } from '../config'
import { displayAppName, portalTagline, loadWhiteLabel, applyWhiteLabel } from '../lib/whiteLabel'
import { openWhatsApp, openEmail } from '../lib/share'

const PAGES = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'quotes', label: 'Quotes', path: '/quotes' },
  { id: 'invoices', label: 'Invoices', path: '/invoices' },
  { id: 'service', label: 'Service', path: '/service' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

function StatusPill({ status }) {
  const s = normalizeQuoteStatus(status)
  const map = {
    accepted: { bg: 'rgba(16,185,129,.18)', color: '#059669', label: 'Accepted' },
    rejected: { bg: 'rgba(239,68,68,.15)', color: '#dc2626', label: 'Rejected' },
    converted: { bg: 'rgba(59,130,246,.15)', color: '#2563eb', label: 'Invoiced' },
    sent: { bg: 'rgba(245,158,11,.15)', color: '#d97706', label: 'Awaiting you' },
    draft: { bg: 'rgba(148,163,184,.15)', color: '#64748b', label: 'Draft' },
    expired: { bg: 'rgba(100,116,139,.15)', color: '#64748b', label: 'Expired' },
    unpaid: { bg: 'rgba(245,158,11,.15)', color: '#d97706', label: 'Unpaid' },
    partial: { bg: 'rgba(59,130,246,.15)', color: '#2563eb', label: 'Partial' },
    overdue: { bg: 'rgba(239,68,68,.15)', color: '#dc2626', label: 'Overdue' },
    paid: { bg: 'rgba(16,185,129,.18)', color: '#059669', label: 'Paid' },
    open: { bg: 'rgba(245,158,11,.15)', color: '#d97706', label: 'Open' },
    in_progress: { bg: 'rgba(59,130,246,.15)', color: '#2563eb', label: 'In progress' },
    done: { bg: 'rgba(16,185,129,.18)', color: '#059669', label: 'Done' },
    resolved: { bg: 'rgba(16,185,129,.18)', color: '#059669', label: 'Resolved' },
    waiting: { bg: 'rgba(245,158,11,.15)', color: '#d97706', label: 'Waiting' },
  }
  const m = map[s] || map[String(status || '').toLowerCase()] || map.draft
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        background: m.bg,
        color: m.color,
      }}
    >
      {m.label}
    </span>
  )
}

function shellStyle() {
  return {
    minHeight: '100vh',
    background: 'var(--bg, #0f172a)',
    color: 'var(--text, #e2e8f0)',
  }
}

function cardStyle(extra = {}) {
  return {
    background: 'var(--card, rgba(30,41,59,.85))',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    border: '1px solid rgba(148,163,184,.15)',
    ...extra,
  }
}

export default function Portal() {
  const location = useLocation()
  const params = useParams()
  const nav = useNavigate()
  const token = useMemo(
    () => extractPortalToken(location.search, location.pathname) || params.token || '',
    [location.search, location.pathname, params.token],
  )

  const page = useMemo(() => {
    const p = String(location.pathname || '')
    if (/\/portal\/[^/]+\/quotes/i.test(p) || params.section === 'quotes') return 'quotes'
    if (/\/portal\/[^/]+\/invoices/i.test(p) || params.section === 'invoices') return 'invoices'
    if (/\/portal\/[^/]+\/service/i.test(p) || params.section === 'service') return 'service'
    return 'overview'
  }, [location.pathname, params.section])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [noteById, setNoteById] = useState({})
  const [flash, setFlash] = useState('')
  const [fbScore, setFbScore] = useState(9)
  const [fbNote, setFbNote] = useState('')
  const [fbMsg, setFbMsg] = useState('')
  const wl = useMemo(() => loadWhiteLabel(), [])
  const brand = displayAppName(APP_NAME)
  const tagline = portalTagline('Client portal')

  useEffect(() => {
    applyWhiteLabel(wl)
  }, [wl])

  const load = async () => {
    if (!token) {
      setError('This portal link is missing a token. Ask the shop to resend the link.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const view = await fetchPortalView(token)
      setData(view)
    } catch (e) {
      setError(e?.message || 'Could not open portal')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const company = data?.company || data?.workspace?.company || {}
  const client = data?.client || {}
  const quotes = data?.quotes || data?.workspace?.quotes || []
  const invoices = data?.invoices || data?.workspace?.invoices || []
  const tickets = data?.tickets || data?.jobs || data?.workspace?.tickets || []
  const summary = portalQuoteSummary(quotes)

  const openBal = (invoices || [])
    .filter((i) => ['unpaid', 'partial', 'overdue'].includes(String(i.status || '').toLowerCase()))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)

  const openJobs = (tickets || []).filter(
    (t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()),
  )

  const basePath = token ? `/portal/${encodeURIComponent(token)}` : '/portal'

  const go = (section) => {
    if (section === 'overview') nav(basePath)
    else nav(`${basePath}/${section}`)
  }

  const decide = async (quote, action) => {
    if (!canDecideQuote(quote)) return
    setBusyId(quote.id)
    setFlash('')
    try {
      const res = await submitPortalQuoteDecision(token, quote.id, action, noteById[quote.id] || '', {
        quote,
      })
      if (res?.offline) {
        setFlash(
          action === 'reject'
            ? `Quote ${quote.number || ''} declined offline — saved until the shop syncs.`
            : `Quote ${quote.number || ''} accepted offline — saved until the shop syncs.`,
        )
        setData((d) => {
          if (!d) return d
          const list = (d.quotes || d.workspace?.quotes || []).map((q) =>
            String(q.id) === String(quote.id)
              ? {
                  ...q,
                  status: action === 'reject' ? 'rejected' : 'accepted',
                  portalDecision: action === 'reject' ? 'rejected' : 'accepted',
                }
              : q,
          )
          return d.quotes ? { ...d, quotes: list } : { ...d, workspace: { ...d.workspace, quotes: list } }
        })
      } else {
        setFlash(
          action === 'reject'
            ? `Quote ${quote.number || ''} declined — the shop has been notified.`
            : `Quote ${quote.number || ''} accepted — thank you! The shop will follow up.`,
        )
        await load()
      }
    } catch (e) {
      setFlash(e?.message || 'Decision failed — try again or WhatsApp the shop')
    } finally {
      setBusyId(null)
    }
  }

  const submitFeedback = async () => {
    setFbMsg('')
    try {
      const base = 'https://saip-sync.onrender.com'
      const res = await fetch(`${base}/api/portal/${encodeURIComponent(token)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ score: Number(fbScore), note: fbNote }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Could not send feedback')
      setFbMsg(`Thanks — score ${j.score ?? fbScore} recorded`)
      setFbNote('')
    } catch (e) {
      setFbMsg(e?.message || 'Feedback unavailable right now')
    }
  }

  const payInvoice = async (inv) => {
    try {
      const base = 'https://saip-sync.onrender.com'
      const res = await fetch(
        `${base}/api/portal/${encodeURIComponent(token)}/pay/${encodeURIComponent(inv.id)}`,
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Pay link failed')
      if (!j.configured) {
        setFlash(j.message || 'Pay online not configured — use EFT / contact the shop')
        return
      }
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = j.processUrl
      Object.entries(j.fields || {}).forEach(([k, v]) => {
        const inp = document.createElement('input')
        inp.type = 'hidden'
        inp.name = k
        inp.value = v
        form.appendChild(inp)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (e) {
      setFlash(e?.message || 'Could not start payment')
    }
  }

  const navBar = (
    <nav
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 16,
        position: 'sticky',
        top: 0,
        zIndex: 5,
        padding: '8px 0',
        background: 'var(--bg, #0f172a)',
      }}
    >
      {PAGES.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => go(p.id === 'overview' ? 'overview' : p.id)}
          style={{
            appearance: 'none',
            border: page === p.id ? '1px solid var(--accent, #e879f9)' : '1px solid rgba(148,163,184,.25)',
            background: page === p.id ? 'rgba(232,121,249,.15)' : 'transparent',
            color: 'inherit',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {p.label}
          {p.id === 'quotes' && summary.open ? ` (${summary.open})` : ''}
          {p.id === 'invoices' && openBal > 0 ? ' ·' : ''}
        </button>
      ))}
    </nav>
  )

  const header = (
    <header style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.04 }}>
        {brand} · {tagline}
      </div>
      <h1 style={{ margin: '6px 0 4px', fontSize: 22 }}>{company.name || 'Your service provider'}</h1>
      <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>
        {client.name ? `Hi ${client.name.split(' ')[0]}` : 'Secure view'} · v{APP_VERSION}
      </p>
    </header>
  )

  const quotesBlock = (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Quotes for your approval</h2>
      {!quotes.length ? (
        <div style={cardStyle()}>No quotes on this portal yet.</div>
      ) : (
        quotes.map((qt) => {
          const open = canDecideQuote(qt)
          return (
            <div key={qt.id || qt.number} style={cardStyle()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong>{qt.number || 'Quote'}</strong> <StatusPill status={qt.status} />
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {formatMoney(qt.total)} · dated {formatDate(qt.date)}
                    {qt.validUntil ? ` · valid until ${formatDate(qt.validUntil)}` : ''}
                  </div>
                </div>
              </div>
              {Array.isArray(qt.lines) && qt.lines.length > 0 && (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {qt.lines.slice(0, 8).map((l, i) => (
                    <li key={i}>
                      {(l.qty != null ? `${l.qty}× ` : '') + (l.description || l.name || 'Line')}{' '}
                      <span style={{ opacity: 0.75 }}>{formatMoney(l.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {open && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.75 }}>
                    Optional note to the shop
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    style={{ width: '100%', marginBottom: 8 }}
                    placeholder="e.g. Please start next week · COD on collection"
                    value={noteById[qt.id] || ''}
                    onChange={(e) => setNoteById((m) => ({ ...m, [qt.id]: e.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!!busyId}
                      onClick={() => decide(qt, 'approve')}
                    >
                      {busyId === qt.id ? 'Saving…' : 'Accept quote'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={!!busyId}
                      onClick={() => decide(qt, 'reject')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}
              {!open && qt.portalNote ? (
                <p style={{ margin: '10px 0 0', fontSize: 13, opacity: 0.8 }}>Your note: {qt.portalNote}</p>
              ) : null}
            </div>
          )
        })
      )}
    </>
  )

  const invoicesBlock = (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Invoices & balance</h2>
      <div style={cardStyle({ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 })}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Open balance</div>
          <strong style={{ fontSize: 22 }}>{formatMoney(openBal)}</strong>
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'} on file
        </div>
      </div>
      {!invoices.length ? (
        <div style={cardStyle()}>No invoices yet.</div>
      ) : (
        invoices.map((inv) => {
          const due = Number(inv.amountDue ?? inv.total) || 0
          const canPay =
            due > 0 && ['unpaid', 'partial', 'overdue'].includes(String(inv.status || '').toLowerCase())
          return (
            <div
              key={inv.id || inv.number}
              style={{
                ...cardStyle(),
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{inv.number || 'Invoice'}</strong> <StatusPill status={inv.status} />
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  {formatDate(inv.date)}
                  {inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{formatMoney(due)}</strong>
                {canPay ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => payInvoice(inv)}>
                    Pay
                  </button>
                ) : null}
              </div>
            </div>
          )
        })
      )}
    </>
  )

  const serviceBlock = (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Jobs & service</h2>
      {!tickets.length ? (
        <div style={cardStyle()}>
          No open job cards shared on this link yet. The shop can still help via WhatsApp or phone.
        </div>
      ) : (
        tickets.map((t) => (
          <div key={t.id || t.number} style={cardStyle()}>
            <strong>{t.title || t.number || 'Job'}</strong> <StatusPill status={t.status || 'open'} />
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              {t.device || t.imei ? [t.device, t.imei].filter(Boolean).join(' · ') : null}
              {t.promisedAt || t.dueDate
                ? ` · promised ${formatDate(t.promisedAt || t.dueDate)}`
                : ''}
            </div>
            {t.publicNote || t.customerNote ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.85 }}>
                {t.publicNote || t.customerNote}
              </p>
            ) : null}
          </div>
        ))
      )}

      <h2 style={{ fontSize: 16, margin: '20px 0 12px' }}>Contact the shop</h2>
      <div style={cardStyle()}>
        <div style={{ marginBottom: 8 }}>
          <strong>{company.name || 'Shop'}</strong>
        </div>
        {company.phone || company.whatsapp ? (
          <div style={{ fontSize: 14, marginBottom: 6 }}>Phone / WA: {company.phone || company.whatsapp}</div>
        ) : null}
        {company.email ? <div style={{ fontSize: 14, marginBottom: 12 }}>Email: {company.email}</div> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              openWhatsApp(
                company.whatsapp || company.phone,
                `Hi ${company.name || ''}, I'm messaging from my client portal (${client.name || 'client'}).`,
              )
            }
          >
            WhatsApp shop
          </button>
          {company.email ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                openEmail(
                  company.email,
                  `Portal enquiry — ${client.name || 'client'}`,
                  'Hello, I have a question from the client portal.\n',
                )
              }
            >
              Email
            </button>
          ) : null}
        </div>
      </div>

      <h2 style={{ fontSize: 16, margin: '20px 0 12px' }}>Rate this service</h2>
      <div style={cardStyle()}>
        <p style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.8 }}>0–10 · helps the shop improve</p>
        <input
          type="range"
          min={0}
          max={10}
          value={fbScore}
          onChange={(e) => setFbScore(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontWeight: 700, margin: '8px 0' }}>{fbScore}</div>
        <input
          className="input"
          style={{ width: '100%', marginBottom: 8 }}
          placeholder="Optional note"
          value={fbNote}
          onChange={(e) => setFbNote(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={submitFeedback}>
          Send feedback
        </button>
        {fbMsg ? <p style={{ margin: '8px 0 0', fontSize: 13 }}>{fbMsg}</p> : null}
      </div>
    </>
  )

  const overviewBlock = (
    <>
      <div
        style={{
          ...cardStyle(),
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Open balance</div>
          <strong style={{ fontSize: 20 }}>{formatMoney(openBal)}</strong>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Quotes</div>
          <strong>
            {summary.open} open · {summary.accepted} accepted
          </strong>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Jobs</div>
          <strong>{openJobs.length} open</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" style={{ textAlign: 'left' }} onClick={() => go('quotes')}>
          Quotes — accept or decline ({summary.open} waiting)
        </button>
        <button type="button" className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => go('invoices')}>
          Invoices & pay · {formatMoney(openBal)} due
        </button>
        <button type="button" className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => go('service')}>
          Jobs, contact & feedback
        </button>
      </div>

      {summary.open > 0 && (
        <div style={cardStyle({ borderLeft: '4px solid #f59e0b' })}>
          <strong>Action needed:</strong> you have {summary.open} quote{summary.open > 1 ? 's' : ''} waiting for
          Accept or Decline.{' '}
          <button type="button" className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={() => go('quotes')}>
            Review quotes
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="portal-public" style={shellStyle()}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
        {header}

        {loading && <div style={cardStyle()}>Loading your portal…</div>}

        {!loading && error && (
          <div style={cardStyle({ borderLeft: '4px solid #f59e0b' })}>
            <strong>Could not open portal</strong>
            <p style={{ margin: '8px 0 0', opacity: 0.85 }}>{error}</p>
            <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.7 }}>
              Links expire after the days set by the shop. Ask them to create a fresh portal link from Clients.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {navBar}
            {flash ? (
              <div
                style={{
                  ...cardStyle(),
                  background: 'rgba(16,185,129,.12)',
                  border: '1px solid rgba(16,185,129,.35)',
                }}
              >
                {flash}
              </div>
            ) : null}

            {page === 'overview' && overviewBlock}
            {page === 'quotes' && quotesBlock}
            {page === 'invoices' && invoicesBlock}
            {page === 'service' && serviceBlock}

            <p style={{ marginTop: 28, fontSize: 12, opacity: 0.55 }}>
              POPIA: this link is personal — do not forward. Contact the shop if anything looks wrong.
              {!wl.hidePoweredBy ? ` Powered by ${APP_NAME}.` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
