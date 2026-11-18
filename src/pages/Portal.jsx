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


function safeText(value) {
  return String(value == null ? '' : value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
}
function downloadCsv(filename, rows) {
  const csv = (rows || []).map((row) => row.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function printInvoice(inv, company, client) {
  const win = window.open('', '_blank')
  if (!win) return
  const rows = (inv.lines || []).map((line) => '<tr><td>' + safeText(line.description) + '</td><td>' + safeText(line.qty || 1) + '</td><td>' + safeText(formatMoney((Number(line.qty) || 1) * (Number(line.price) || 0))) + '</td></tr>').join('')
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + safeText(inv.number || 'Invoice') + '</title><style>body{font:14px Arial;color:#17202a;padding:32px;max-width:900px;margin:auto}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0f766e;padding-bottom:18px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd;vertical-align:top}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}.muted{color:#64748b}@media print{button{display:none}}</style></head><body><header><div><h2>' + safeText(company.name || 'Service provider') + '</h2><p>' + safeText(company.address || '') + '<br>' + safeText(company.email || '') + '</p></div><div><h1>INVOICE</h1><b>' + safeText(inv.number || '') + '</b><p class="muted">' + safeText(inv.date || '') + '</p></div></header><p><b>Bill to:</b> ' + safeText(client.name || client.email || '') + '</p><table><thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead><tbody>' + rows + '</tbody></table><div class="total">Total: ' + safeText(formatMoney(inv.total || 0)) + '</div><p>Amount due: ' + safeText(formatMoney(inv.amountDue ?? inv.total ?? 0)) + '</p><p class="muted">' + safeText(inv.notes || '') + '</p><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>')
  win.document.close()
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
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Invoices & balance</h2>
      <div style={cardStyle({ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 })}>
        <div><div style={{ fontSize: 12, opacity: 0.7 }}>Open balance</div><strong style={{ fontSize: 22 }}>{formatMoney(openBal)}</strong></div>
      </div>
      {!invoices.length ? <div style={cardStyle()}>No invoices yet.</div> : invoices.map((inv) => (
        <div key={inv.id || inv.number} style={cardStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><strong>{inv.number || 'Invoice'}</strong> <StatusPill status={inv.status} /><div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Issued {formatDate(inv.date)} · Due {formatDate(inv.dueDate)}</div></div>
            <strong style={{ fontSize: 20 }}>{formatMoney(inv.total)}</strong>
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>Paid: {formatMoney(inv.amountPaid || 0)} · Balance: {formatMoney(inv.amountDue ?? inv.total ?? 0)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => printInvoice(inv, company, client)}>Download / Print invoice</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadCsv((inv.number || 'invoice') + '-items.csv', [['Description','Quantity','Unit price','Line total'], ...(inv.lines || []).map((line) => [line.description, line.qty, line.price, (Number(line.qty) || 1) * (Number(line.price) || 0)])])}>Download item list</button>
          </div>
        </div>
      ))}
    </>
  )

  const paymentsBlock = (
    <>
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Payments & account statement</h2>
      <div style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div><div style={{ fontSize: 12, opacity: 0.7 }}>Paid to date</div><strong style={{ fontSize: 22 }}>{formatMoney(paidTotal)}</strong><div style={{ fontSize: 13, opacity: 0.8 }}>Outstanding: {formatMoney(data?.accountStatement?.openBalance ?? openBal)}</div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadCsv('account-statement.csv', [['Date','Type','Reference','Description','Debit','Credit'], ...((data?.accountStatement?.entries || []).map((e) => [e.date,e.type,e.reference,e.description,e.debit,e.credit]))])}>Download statement CSV</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </div>
      </div>
      {!(data?.payments || []).length ? <div style={cardStyle()}>No payments recorded yet.</div> : (data.payments || []).map((p, i) => (
        <div key={p.id || i} style={cardStyle()}><strong>{formatMoney(p.amount || p.paidAmount || p.value)}</strong><div style={{ fontSize: 13, opacity: 0.8 }}>{formatDate(p.date || p.paidAt)} · {p.method || p.reference || 'Payment received'}</div>{p.reference && <div style={{ fontSize: 12, opacity: 0.7 }}>Reference: {p.reference}</div>}</div>
      ))}
      <div style={cardStyle()}>
        <strong>Statement activity</strong>
        {(data?.accountStatement?.entries || []).map((entry, index) => <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(148,163,184,.15)' }}><div><b>{entry.type}</b><div style={{ fontSize: 12, opacity: .75 }}>{formatDate(entry.date)} · {entry.reference || ''} · {entry.description || ''}</div></div><div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{entry.debit ? formatMoney(entry.debit) : ''}{entry.credit ? <div>{formatMoney(entry.credit)} credit</div> : ''}</div></div>)}
      </div>
    </>
  )

  const serviceBlock = (
    <>
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Service history & job cards</h2>
      {!tickets.length ? <div style={cardStyle()}>No job cards have been shared with this portal yet.</div> : tickets.map((t) => (
        <div key={t.id || t.number} style={cardStyle()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><strong>{t.title || t.subject || t.number || t.id}</strong><StatusPill status={t.status} /></div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Job reference: {t.id || '—'} · {t.jobType || 'Service'} · {formatDate(t.scheduledDate || t.createdAt)}</div>
          {t.siteAddress && <div style={{ fontSize: 13, marginTop: 4 }}>Service location: {t.siteAddress}</div>}
          {t.technician && <div style={{ fontSize: 13, marginTop: 4 }}>Technician: {t.technician}</div>}
          {t.description && <p style={{ fontSize: 13, margin: '8px 0 0' }}>{t.description}</p>}
          {t.workDone && <p style={{ fontSize: 13, margin: '8px 0 0' }}><b>Work completed:</b> {t.workDone}</p>}
          {Array.isArray(t.parts) && t.parts.length > 0 && <div style={{ marginTop: 8 }}><b style={{ fontSize: 13 }}>Parts / materials</b>{t.parts.map((part, i) => <div key={i} style={{ fontSize: 13 }}>{part.name || part.description} · Qty {part.qty || 1}</div>)}</div>}
          {Array.isArray(t.attachments) && t.attachments.length > 0 && <div style={{ marginTop: 12 }}><b style={{ fontSize: 13 }}>Job photos & documents</b><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>{t.attachments.map((file) => <a key={file.id} href={file.dataUrl} download={file.name} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">{file.name || 'Download attachment'}</a>)}</div></div>}
        </div>
      ))}
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
