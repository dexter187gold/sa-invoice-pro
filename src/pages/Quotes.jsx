import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatusBadge,
  formatDateZA, FilterChips, downloadCsv,
} from '../components/ui'
import {
  listQueuedPortalDecisions,
  clearQueuedPortalDecisions,
  applyPortalDecisionLocally,
} from '../lib/portalQuote'
import { convertQuoteToInvoice, canConvertQuote } from '../lib/quoteConvert'
import { SYNC_API_URL, APP_LINKS } from '../config'
import PageInsightsBar from '../components/PageInsightsBar'

export default function Quotes() {
  const nav = useNavigate()
  const { quotes, clients, company, vatRate, vatEnabled, refresh, toast } = useApp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [queue, setQueue] = useState([])
  const [convertingId, setConvertingId] = useState(null)

  useEffect(() => {
    setQueue(listQueuedPortalDecisions())
  }, [quotes])

  const counts = useMemo(() => {
    const c = { all: quotes.length, draft: 0, converted: 0, accepted: 0, rejected: 0, expired: 0 }
    for (const qt of quotes) {
      const s = String(qt.status || 'draft').toLowerCase()
      if (c[s] != null) c[s]++
    }
    return c
  }, [quotes])

  const filtered = useMemo(() => {
    return quotes.filter((qt) => {
      if (status !== 'all' && String(qt.status || 'draft').toLowerCase() !== status) return false
      const c = clients.find((x) => String(x.id) === String(qt.clientId))
      return matchesQuery(
        { ...qt, clientName: c?.name || '' },
        q,
        ['number', 'status', 'clientName', 'portalNote'],
      )
    })
  }, [quotes, clients, q, status])

  const applyQueue = async () => {
    const items = listQueuedPortalDecisions()
    if (!items.length) return toast('No offline portal decisions queued', 'info')
    let applied = 0
    for (const item of items) {
      const qt = quotes.find((x) => String(x.id) === String(item.quoteId))
      if (!qt) continue
      const { updated } = applyPortalDecisionLocally([qt], item.quoteId, item.action, item.note)
      if (updated) {
        await db.put(STORES.quotes, updated)
        applied++
      }
    }
    clearQueuedPortalDecisions()
    setQueue([])
    await refresh()
    toast(applied ? `Applied ${applied} portal decision(s)` : 'Queue cleared (no matching local quotes)', 'success')
  }

  const pullCloudDecisions = async () => {
    try {
      const base = (SYNC_API_URL || APP_LINKS.syncServer || '').replace(/\/$/, '')
      const res = await fetch(`${base}/api/portal/decisions?limit=30`, { headers: { Accept: 'application/json' } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || 'Could not fetch decisions')
      const rows = data.data || data.decisions || []
      let applied = 0
      for (const item of rows) {
        const qt = quotes.find((x) => String(x.id) === String(item.quoteId))
        if (!qt) continue
        const action = item.action === 'rejected' || item.action === 'reject' ? 'reject' : 'approve'
        const { updated } = applyPortalDecisionLocally([qt], item.quoteId, action, item.note)
        if (updated && String(qt.status) !== String(updated.status)) {
          await db.put(STORES.quotes, updated)
          applied++
        }
      }
      await refresh()
      toast(applied ? `Synced ${applied} decision(s) from cloud` : `Cloud returned ${rows.length} decision(s)`, 'success')
    } catch (e) {
      toast(e?.message || 'Cloud decisions unavailable', 'info')
    }
  }

  const convert = async (qt) => {
    if (!canConvertQuote(qt)) return toast('Quote cannot be converted', 'error')
    setConvertingId(qt.id)
    try {
      const inv = await convertQuoteToInvoice(qt, { invoices: [], vatRate: vatRate ?? 0.15, vatEnabled: vatEnabled !== false })
      await refresh()
      toast(`Invoice created from ${qt.number || 'quote'}`, 'success')
      nav(`/invoices/${inv.id}`)
    } catch (e) {
      toast(e?.message || 'Convert failed', 'error')
    } finally {
      setConvertingId(null)
    }
  }

  const del = (id) => {
    setConfirm({
      title: 'Delete quote?',
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.quotes, id)
        await refresh()
        setConfirm(null)
        toast('Deleted', 'success')
      },
    })
  }

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'accepted', label: 'Accepted', count: counts.accepted },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
    { id: 'converted', label: 'Converted', count: counts.converted },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <p className="subtitle">Portal Accept/Decline · offline queue · convert to invoice · {quotes.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={pullCloudDecisions}>Pull cloud decisions</button>
          <Link className="btn btn-primary" to="/quotes/new">New quote</Link>
        </div>
      </div>

      <PageInsightsBar page="quotes" />

      {queue.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--warning, #fbbf24)' }}>
          <strong>{queue.length} offline portal decision(s)</strong>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 12 }} onClick={applyQueue}>
            Apply queue
          </button>
        </div>
      )}

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search quotes…" />
        <FilterChips options={chips} value={status} onChange={setStatus} />
      </div>

      {!filtered.length ? (
        <EmptyState title={quotes.length ? 'No matches' : 'No quotes yet'} hint="Create a quote and share the portal link for client Accept/Decline." />
      ) : (
        filtered.map((qt) => {
          const c = clients.find((x) => String(x.id) === String(qt.clientId))
          const st = String(qt.status || 'draft').toLowerCase()
          const canConv = canConvertQuote(qt)
          return (
            <div key={qt.id} className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <strong>{qt.number}</strong> · {c?.name || '—'}
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatMoney(qt.total)} · <StatusBadge status={st} />
                  {qt.date ? ` · ${formatDateZA(qt.date)}` : ''}
                  {qt.portalDecision ? ` · portal: ${qt.portalDecision}` : ''}
                </div>
                {qt.portalNote ? <div style={{ fontSize: 12, marginTop: 4 }}>Client note: {qt.portalNote}</div> : null}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {canConv && (
                  <button type="button" className="btn btn-primary btn-sm" disabled={convertingId === qt.id} onClick={() => convert(qt)}>
                    {convertingId === qt.id ? '…' : 'Convert'}
                  </button>
                )}
                {st === 'converted' && (
                  <Link className="btn btn-outline btn-sm" to={qt.invoiceId ? `/invoices/${qt.invoiceId}` : '/invoices'}>Invoice</Link>
                )}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => del(qt.id)}>Del</button>
              </div>
            </div>
          )
        })
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
      />
    </PageFade>
  )
}
