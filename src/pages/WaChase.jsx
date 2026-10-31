import React, { useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PageFade, StatCard, EmptyState, SearchInput, matchesQuery } from '../components/ui'
import { formatMoney } from '../lib/money'
import {
  buildChaseList,
  buildCollectionChaseList,
  buildLiveExampleMessage,
  waMeUrl,
} from '../lib/chasePack'
import { sendWhatsAppText, hasCloudCredentials } from '../lib/whatsapp'
import { toWaNumber } from '../lib/share'
import PageInsightsBar from '../components/PageInsightsBar'

/**
 * Staff-assisted WhatsApp chase queue.
 * - Opens wa.me with pre-filled text (staff taps Send), OR
 * - Sends via Meta Cloud API when Dev Portal / settings credentials exist.
 */
export default function WaChase() {
  const { invoices, tickets, clients, company, toast } = useApp()
  const [tab, setTab] = useState('invoices')
  const [q, setQ] = useState('')
  const [done, setDone] = useState(() => new Set())
  const [busyId, setBusyId] = useState(null)
  const [modeInfo, setModeInfo] = useState(null)
  const [preview, setPreview] = useState(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cloud = await hasCloudCredentials()
        if (alive) setModeInfo({ mode: cloud ? 'cloud' : 'wa.me', configured: !!cloud })
      } catch {
        if (alive) setModeInfo({ mode: 'wa.me', configured: false })
      }
    })()
    return () => { alive = false }
  }, [])

  const invoiceRows = useMemo(
    () => buildChaseList(invoices || [], clients || [], company || {}),
    [invoices, clients, company],
  )
  const jobRows = useMemo(
    () => buildCollectionChaseList(tickets || [], clients || [], company || {}),
    [tickets, clients, company],
  )

  const rows = useMemo(() => {
    const base = tab === 'jobs' ? jobRows : invoiceRows
    if (!q.trim()) return base
    return base.filter((r) =>
      matchesQuery(
        {
          name: r.client?.name || '',
          phone: r.phone || '',
          num: r.inv?.number || r.ticket?.number || r.ticket?.title || '',
          msg: r.message || '',
        },
        q,
        ['name', 'phone', 'num', 'msg'],
      ),
    )
  }, [tab, invoiceRows, jobRows, q])

  const pending = rows.filter((r) => !done.has(r.id))
  const withPhone = pending.filter((r) => r.hasPhone)
  const noPhone = pending.filter((r) => !r.hasPhone)

  const exampleMsg = useMemo(() => buildLiveExampleMessage(company || {}), [company])
  const exampleUrl = useMemo(() => waMeUrl('0821234567', exampleMsg), [exampleMsg])

  const markDone = useCallback((id) => {
    setDone((prev) => {
      const n = new Set(prev)
      n.add(id)
      return n
    })
  }, [])

  const sendOne = async (row) => {
    if (!row) return
    setBusyId(row.id)
    try {
      const result = await sendWhatsAppText(row.phone, row.message)
      const mode = result?.mode || 'wa.me'
      if (result?.ok !== false) {
        markDone(row.id)
        toast(
          mode === 'cloud'
            ? `Cloud API sent · ${row.client?.name || row.phone}`
            : `WhatsApp opened · tap Send · ${row.client?.name || 'contact'}`,
          mode === 'cloud' ? 'success' : 'info',
        )
      } else {
        window.open(row.url, '_blank', 'noopener,noreferrer')
        markDone(row.id)
        toast('Opened wa.me fallback — tap Send in WhatsApp', 'info')
      }
    } catch (e) {
      window.open(row.url, '_blank', 'noopener,noreferrer')
      markDone(row.id)
      toast(e?.message || 'Opened wa.me', 'info')
    } finally {
      setBusyId(null)
    }
  }

  const sendNext = async () => {
    const next = withPhone.find((r) => !done.has(r.id))
    if (!next) return toast('Queue clear — nothing left with a phone number', 'info')
    await sendOne(next)
  }

  const channelLabel =
    modeInfo?.mode === 'cloud' || modeInfo?.configured
      ? 'Cloud API ready · falls back to wa.me if send fails'
      : 'wa.me mode · staff taps Send (Cloud unlocks after Meta 2FA)'

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp chase</h1>
          <p className="subtitle">
            Staff queue · overdue invoices & collection jobs · dual path (wa.me + Cloud)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={sendNext} disabled={!withPhone.length}>
            Open next ({withPhone.length})
          </button>
          <Link className="btn btn-outline" to="/payments">Payments</Link>
          <Link className="btn btn-outline" to="/reports">Reports</Link>
          <Link className="btn btn-outline" to="/clients">Clients</Link>
        </div>
      </div>

      <PageInsightsBar page="payments" />

      <div
        className="card"
        style={{
          marginBottom: '1rem',
          borderLeft: '4px solid var(--accent, #0d9488)',
          fontSize: 13,
        }}
      >
        <strong>Channel:</strong> {channelLabel}
        <div className="muted" style={{ marginTop: 6 }}>
          wa.me never auto-sends — WhatsApp opens with the message filled in. Cloud API sends without a tap when Meta credentials are set in Dev Portal / Settings.
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="In queue" value={pending.length} />
        <StatCard label="With phone" value={withPhone.length} tone="good" />
        <StatCard label="No phone" value={noPhone.length} tone={noPhone.length ? 'warn' : 'good'} />
        <StatCard label="Done this session" value={done.size} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Live example (demo number)</h3>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              Opens WhatsApp to <code>082 123 4567</code> → <code>27…</code> with a sample chase. Use real clients below.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPreview(preview === 'example' ? null : 'example')}
            >
              {preview === 'example' ? 'Hide text' : 'Preview text'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                window.open(exampleUrl, '_blank', 'noopener,noreferrer')
                toast('Demo wa.me opened — change number in Clients for real sends', 'info')
              }}
            >
              Open demo wa.me
            </button>
          </div>
        </div>
        {preview === 'example' && (
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: 'var(--surface-2, #0f172a0d)',
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              fontSize: 13,
            }}
          >
            {exampleMsg}
          </pre>
        )}
        <p className="muted" style={{ marginTop: 8, fontSize: 12, wordBreak: 'break-all' }}>
          Link: {exampleUrl.slice(0, 120)}…
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'invoices' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('invoices')}
        >
          Open invoices ({invoiceRows.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'jobs' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('jobs')}
        >
          Collection jobs ({jobRows.length})
        </button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <SearchInput value={q} onChange={setQ} placeholder="Filter name, phone, invoice…" />
        </div>
        {done.size > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDone(new Set())}>
            Reset session done
          </button>
        )}
      </div>

      {!rows.length && (
        <EmptyState
          title={tab === 'jobs' ? 'No collection jobs' : 'No open invoices'}
          hint={tab === 'jobs' ? 'Mark jobs ready for collection on Tickets.' : 'Record invoices that are unpaid / partial / overdue.'}
          action={<Link className="btn btn-primary btn-sm" to={tab === 'jobs' ? '/tickets' : '/invoices/new'}>{tab === 'jobs' ? 'Jobs' : 'New invoice'}</Link>}
        />
      )}

      {rows.map((r) => {
        const isDone = done.has(r.id)
        const title =
          r.kind === 'job'
            ? (r.ticket?.title || r.ticket?.number || r.id)
            : (r.inv?.number || r.id)
        const bal =
          r.kind === 'invoice'
            ? formatMoney(Number(r.inv?.amountDue ?? r.inv?.total) || 0)
            : null
        return (
          <div
            key={r.id}
            className="list-card"
            style={{
              opacity: isDone ? 0.55 : 1,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ minWidth: 180 }}>
              <strong>{title}</strong>
              {' · '}
              {r.client?.name || 'No client'}
              <div className="muted" style={{ fontSize: 13 }}>
                {r.hasPhone ? toWaNumber(r.phone) : '⚠ No phone on client'}
                {bal ? ` · ${bal}` : ''}
                {r.days > 0 ? ` · ${r.days}d overdue` : ''}
                {isDone ? ' · done' : ''}
              </div>
            </div>
            <div className="list-card-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPreview(preview === r.id ? null : r.id)}
              >
                Preview
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isDone || busyId === r.id || !r.hasPhone}
                onClick={() => sendOne(r)}
              >
                {busyId === r.id ? '…' : isDone ? 'Done' : 'Send / Open WA'}
              </button>
              {!r.hasPhone && (
                <Link className="btn btn-outline btn-sm" to="/clients">
                  Add phone
                </Link>
              )}
            </div>
            {preview === r.id && (
              <pre
                style={{
                  width: '100%',
                  margin: '8px 0 0',
                  padding: 10,
                  background: 'var(--surface-2, #0f172a0d)',
                  borderRadius: 8,
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                }}
              >
                {r.message}
              </pre>
            )}
          </div>
        )
      })}
    </PageFade>
  )
}
