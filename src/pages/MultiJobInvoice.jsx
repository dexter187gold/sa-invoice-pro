import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { invoiceFromTickets, ticketsShareClient } from '../lib/jobBill'
import { addImageAttachments, addDocumentAttachments, listAttachments, listTicketPhotos } from '../lib/attachments'
import { PageFade, LoadingButton } from '../components/ui'

export default function MultiJobInvoice() {
  const { toast, refresh, invoices, vatRate, vatEnabled, clients } = useApp()
  const nav = useNavigate()
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState({})
  const [clientFilter, setClientFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [focusId, setFocusId] = useState(null)

  const load = useCallback(async () => {
    setTickets((await db.getAll(STORES.tickets)) || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openJobs = useMemo(() => {
    return (tickets || []).filter((t) => {
      if (t.invoiceId) return false
      if (['closed'].includes(t.status)) return false
      if (clientFilter && String(t.clientId) !== String(clientFilter)) return false
      return true
    })
  }, [tickets, clientFilter])

  const picked = openJobs.filter((t) => selected[t.id])

  const bill = async () => {
    if (!picked.length) return toast('Select one or more job cards', 'info')
    if (!ticketsShareClient(picked)) return toast('Jobs must share the same client', 'error')
    setBusy(true)
    try {
      const { invoice } = await invoiceFromTickets(picked, {
        invoices: invoices || [],
        vatRate: vatRate ?? 0.15,
        vatEnabled: vatEnabled !== false,
        markResolved: true,
      })
      await refresh?.()
      await load()
      setSelected({})
      toast(`Invoice ${invoice.number} created from ${picked.length} job(s)`, 'success')
      nav(`/invoices/${invoice.id}`)
    } catch (e) {
      toast(e?.message || 'Bill failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const focus = openJobs.find((t) => String(t.id) === String(focusId)) || picked[0] || null

  const attach = async (kind, files) => {
    if (!focus) return toast('Select a job card first', 'info')
    try {
      let next = focus
      if (kind === 'photo') next = await addImageAttachments(focus, files, { key: 'photos' })
      else next = await addDocumentAttachments(focus, files, { key: 'attachments' })
      await db.put(STORES.tickets, next)
      await load()
      toast(kind === 'photo' ? 'Photo attached' : 'Document attached', 'success')
    } catch (e) {
      toast(e?.message || 'Attach failed', 'error')
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Bill multiple job cards</h1>
          <p className="subtitle">Select jobs for one client → one tax invoice (transformer / cabling day work, etc.)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-outline" to="/tickets">← Job desk</Link>
          <LoadingButton className="btn btn-primary" busy={busy} onClick={bill}>
            Create invoice ({picked.length})
          </LoadingButton>
        </div>
      </div>

      <div className="card form-grid" style={{ marginTop: 12 }}>
        <label className="label">Filter by client</label>
        <select className="select input" value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setSelected({}) }}>
          <option value="">All clients</option>
          {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="muted" style={{ fontSize: 13 }}>
          Uninvoiced jobs: {openJobs.length} · Selected: {picked.length}
          {picked.length > 0 && !ticketsShareClient(picked) ? ' · mixed clients' : ''}
        </p>
      </div>

      <div className="ticket-split" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 0 }}>
          {!openJobs.length && <p className="muted" style={{ padding: 16 }}>No uninvoiced job cards match.</p>}
          {openJobs.map((t) => {
            const c = (clients || []).find((x) => String(x.id) === String(t.clientId))
            return (
              <label
                key={t.id}
                className="ticket-list-row"
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={!!selected[t.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [t.id]: e.target.checked }))}
                />
                <button type="button" className="btn btn-ghost btn-sm" style={{ textAlign: 'left', flex: 1 }} onClick={() => setFocusId(t.id)}>
                  <strong>{t.title || t.subject || 'Job'}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c?.name || t.contactName || '—'}
                    {t.scheduledDate ? ` · ${String(t.scheduledDate).slice(0, 10)}` : ''}
                    {t.siteAddress || t.location ? ` · ${t.siteAddress || t.location}` : ''}
                    {t.labourAmount || t.amount ? ` · R ${Number(t.labourAmount || t.amount).toFixed(2)}` : ''}
                  </div>
                </button>
              </label>
            )
          })}
        </div>

        <div className="card form-grid">
          <h3 style={{ marginTop: 0 }}>Attachments on focused job</h3>
          {!focus && <p className="muted">Click a job title to focus it for photos / documents.</p>}
          {focus && (
            <>
              <p><strong>{focus.title || focus.subject}</strong></p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                  Add photos
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { attach('photo', e.target.files); e.target.value = '' }} />
                </label>
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                  Add documents
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf" multiple hidden onChange={(e) => { attach('doc', e.target.files); e.target.value = '' }} />
                </label>
                <Link className="btn btn-ghost btn-sm" to="/tickets">Edit full job card</Link>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {listTicketPhotos(focus).map((p) => (
                  <img key={p.id} src={p.dataUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                ))}
                {listAttachments(focus).map((d) => (
                  <a key={d.id} href={d.dataUrl} download={d.name} className="btn btn-ghost btn-sm">{d.name}</a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageFade>
  )
}
