import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
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
  { id: 'payments', label: 'Payments', path: '/payments' },
  { id: 'service', label: 'Service', path: '/service' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-ZA', {
      day: 'numeric', month: 'short', year: 'numeric',
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
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

function shellStyle() {
  return { minHeight: '100vh', background: 'var(--bg, #0f172a)', color: 'var(--text, #e2e8f0)' }
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
  useEffect(() => {
    const makePageVisible = () => {
      for (const element of [document.documentElement, document.body, document.getElementById('root')]) {
        if (!element) continue
        element.style.setProperty('visibility', 'visible', 'important')
      }
    }
    makePageVisible()
    const observer = new MutationObserver(makePageVisible)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [])
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
    if (/\/portal\/[^/]+\/payments/i.test(p) || params.section === 'payments') return 'payments'
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

  useEffect(() => { applyWhiteLabel(wl) }, [wl])

  const load = async () => {
    if (!token) {
      setError('This portal link is missing a token. Ask the shop to resend the link.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setData(await fetchPortalView(token))
    } catch (e) {
      setError(e?.message || 'Could not open portal')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

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

  const paidInvoices = (invoices || []).filter((i) => String(i.status || '').toLowerCase() === 'paid')
  const paidTotal = paidInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0)

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
      const res = await submitPortalQuoteDecision(token, quote.id, action, noteById[quote.id] || '', { quote })
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
              ? { ...q, status: action === 'reject' ? 'rejected' : 'accepted', portalDecision: action === 'reject' ? 'rejected' : 'accepted' }
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

  const navBar = (
    <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, position: 'sticky', top: 0, zIndex: 5, padding: '8px 0', background: 'var(--bg, #0f172a)' }}>
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
        </button>
      ))}
    </nav>
  )

  const header = (
    <header style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.04 }}>{brand} · {tagline}</div>
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
                  </div>
                </div>
              </div>
              {open && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busyId === qt.id} onClick={() => decide(qt, 'accept')}>Accept</button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busyId === qt.id} onClick={() => decide(qt, 'reject')}>Decline</button>
                </div>
              )}
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
      </div>
      {!invoices.length ? (
        <div style={cardStyle()}>No invoices yet.</div>
      ) : (
        invoices.map((inv) => (
          <div key={inv.id || inv.number} style={{ ...cardStyle(), display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <strong>{inv.number || 'Invoice'}</strong> <StatusPill status={inv.status} />
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                {formatMoney(inv.amountDue != null ? inv.amountDue : inv.total)} · {formatDate(inv.date)}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  )

  const paymentsBlock = (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Payment history</h2>
      <div style={cardStyle()}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Paid to date</div>
        <strong style={{ fontSize: 22 }}>{formatMoney(paidTotal)}</strong>
      </div>
      {!(data?.payments || []).length ? (
        <div style={cardStyle()}>No payments recorded yet.</div>
      ) : (
        (data.payments || []).map((p, i) => (
          <div key={p.id || i} style={cardStyle()}>
            <strong>{formatMoney(p.amount)}</strong>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{formatDate(p.date || p.paidAt)} · {p.method || p.reference || ''}</div>
          </div>
        ))
      )}
    </>
  )

  const serviceBlock = (
    <>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Service / jobs</h2>
      {!openJobs.length && !tickets.length ? (
        <div style={cardStyle()}>No open service jobs.</div>
      ) : (
        (tickets.length ? tickets : openJobs).map((t) => (
          <div key={t.id || t.number} style={cardStyle()}>
            <strong>{t.title || t.subject || t.number || t.id}</strong> <StatusPill status={t.status} />
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{(t.description || '').slice(0, 160)}</div>
          </div>
        ))
      )}
    </>
  )

  const overviewBlock = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        <div style={cardStyle({ marginBottom: 0 })}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Open balance</div>
          <strong style={{ fontSize: 20 }}>{formatMoney(openBal)}</strong>
        </div>
        <div style={cardStyle({ marginBottom: 0 })}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Quotes</div>
          <strong style={{ fontSize: 20 }}>{summary.open} open · {summary.accepted} accepted</strong>
        </div>
        <div style={cardStyle({ marginBottom: 0 })}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Jobs</div>
          <strong style={{ fontSize: 20 }}>{openJobs.length} open</strong>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" style={{ textAlign: 'left' }} onClick={() => go('quotes')}>
          Quotes — accept or decline ({summary.open} waiting)
        </button>
        <button type="button" className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => go('invoices')}>
          Invoices & pay · {formatMoney(openBal)} due
        </button>
        <button type="button" className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => go('payments')}>
          Payment history · {formatMoney(paidTotal)} paid
        </button>
        <button type="button" className="btn btn-outline" style={{ textAlign: 'left' }} onClick={() => go('service')}>
          Jobs, contact & feedback
        </button>
      </div>
    </>
  )

  return (
    <div className="portal-public" data-testid="portal-shell" style={shellStyle()}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
        {header}
        {token ? navBar : null}
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
            {flash ? (
              <div style={{ ...cardStyle(), background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)' }}>
                {flash}
              </div>
            ) : null}
            {page === 'overview' && overviewBlock}
            {page === 'quotes' && quotesBlock}
            {page === 'invoices' && invoicesBlock}
            {page === 'payments' && paymentsBlock}
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
