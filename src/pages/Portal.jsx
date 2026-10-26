import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
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
  }
  const m = map[s] || map.draft
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

export default function Portal() {
  const location = useLocation()
  const params = useParams()
  const token = useMemo(
    () => extractPortalToken(location.search, location.pathname) || params.token || '',
    [location.search, location.pathname, params.token],
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [noteById, setNoteById] = useState({})
  const [flash, setFlash] = useState('')

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
  const summary = portalQuoteSummary(quotes)

  const openBal = (invoices || [])
    .filter((i) => ['unpaid', 'partial', 'overdue'].includes(String(i.status || '').toLowerCase()))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)

  const decide = async (quote, action) => {
    if (!canDecideQuote(quote)) return
    setBusyId(quote.id)
    setFlash('')
    try {
      await submitPortalQuoteDecision(token, quote.id, action, noteById[quote.id] || '')
      setFlash(
        action === 'reject'
          ? `Quote ${quote.number || ''} declined — the shop has been notified.`
          : `Quote ${quote.number || ''} accepted — thank you! The shop will follow up.`,
      )
      await load()
    } catch (e) {
      setFlash(e?.message || 'Decision failed — try again or WhatsApp the shop')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="portal-public" style={{ minHeight: '100vh', background: 'var(--bg, #0f172a)', color: 'var(--text, #e2e8f0)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.04 }}>{APP_NAME} · Client portal</div>
          <h1 style={{ margin: '6px 0 4px', fontSize: 22 }}>
            {company.name || 'Your service provider'}
          </h1>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>
            {client.name ? `Hi ${client.name.split(' ')[0]}` : 'Secure view'} · quotes & balance · v{APP_VERSION}
          </p>
        </header>

        {loading && (
          <div className="card" style={{ padding: 24 }}>
            Loading your portal…
          </div>
        )}

        {!loading && error && (
          <div className="card" style={{ padding: 24, borderLeft: '4px solid #f59e0b' }}>
            <strong>Could not open portal</strong>
            <p style={{ margin: '8px 0 0', opacity: 0.85 }}>{error}</p>
            <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.7 }}>
              Links expire after the days set by the shop. Ask them to create a fresh portal link from Clients.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div
              className="card"
              style={{
                padding: 16,
                marginBottom: 16,
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
                  {summary.open} open · {summary.accepted} accepted · {summary.rejected} declined
                </strong>
              </div>
              {company.phone || company.whatsapp ? (
                <div style={{ marginLeft: 'auto', fontSize: 13 }}>
                  Shop: {company.phone || company.whatsapp}
                </div>
              ) : null}
            </div>

            {flash ? (
              <div
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 12,
                  background: 'rgba(16,185,129,.12)',
                  border: '1px solid rgba(16,185,129,.35)',
                }}
              >
                {flash}
              </div>
            ) : null}

            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Quotes for your approval</h2>

            {!quotes.length ? (
              <div className="card" style={{ padding: 20, opacity: 0.85 }}>
                No quotes on this portal yet. Invoices and statements still appear below when available.
              </div>
            ) : (
              quotes.map((qt) => {
                const open = canDecideQuote(qt)
                return (
                  <div
                    key={qt.id || qt.number}
                    className="card"
                    style={{ padding: 16, marginBottom: 12 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <strong>{qt.number || 'Quote'}</strong>{' '}
                        <StatusPill status={qt.status} />
                        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                          {formatMoney(qt.total)} · dated {formatDate(qt.date)}
                          {qt.validUntil ? ` · valid until ${formatDate(qt.validUntil)}` : ''}
                        </div>
                        {qt.devices || qt.serviceType ? (
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                            {[qt.serviceType, qt.devices].filter(Boolean).join(' · ')}
                          </div>
                        ) : null}
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
                        {qt.lines.length > 8 ? <li>… +{qt.lines.length - 8} more</li> : null}
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

            {invoices.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>Invoices</h2>
                {invoices.slice(0, 20).map((inv) => (
                  <div
                    key={inv.id || inv.number}
                    className="card"
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      flexWrap: 'wrap',
                      fontSize: 14,
                    }}
                  >
                    <span>
                      <strong>{inv.number}</strong> · {formatDate(inv.date)} ·{' '}
                      <StatusPill status={inv.status} />
                    </span>
                    <strong>{formatMoney(inv.amountDue ?? inv.total)}</strong>
                  </div>
                ))}
              </>
            )}

            <p style={{ marginTop: 28, fontSize: 12, opacity: 0.55 }}>
              POPIA: this link is personal — do not forward. Contact the shop if anything looks wrong.
              Powered by {APP_NAME}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
