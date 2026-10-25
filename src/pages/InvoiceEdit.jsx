import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { downloadProfessionalPdf, openProfessionalPdf, TEMPLATE_PRESETS } from '../lib/pdfTemplate'
import { loadInvoiceLayout, DEFAULT_LAYOUT } from '../lib/invoiceLayout'
import { Sync } from '../lib/sync'
import PortalCard from '../components/PortalCard'
import SignaturePad from '../components/SignaturePad'
import { ACCOUNT_TYPES, SUPPORT_TYPES } from '../lib/itCatalog'

function addDays(iso, n) {
  const d = new Date(iso || Date.now())
  d.setDate(d.getDate() + (Number(n) || 0))
  return d.toISOString().slice(0, 10)
}

export default function InvoiceEdit() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { clients, invoices, products, services, payments, vatRate, vatEnabled, refresh, toast, company } = useApp()
  const nav = useNavigate()
  const existing = invoices.find((i) => String(i.id) === String(id))
  const invPayments = payments.filter((p) => String(p.invoiceId) === String(id))

  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('unpaid')
  const [notes, setNotes] = useState('')
  const [templateId, setTemplateId] = useState('standard')
  const [devices, setDevices] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [accountType, setAccountType] = useState('COD Account')
  const [poNumber, setPoNumber] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [technician, setTechnician] = useState('')
  const [serials, setSerials] = useState('')
  const [intro, setIntro] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [includeTerms, setIncludeTerms] = useState(true)
  const [lines, setLines] = useState([{ description: '', qty: 1, price: 0 }])
  const [showClient, setShowClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })
  const [searchParams] = useSearchParams()
  const ticketParam = searchParams.get('ticket')
  const [ticketId, setTicketId] = useState(ticketParam || '')
  const [clientSignature, setClientSignature] = useState('')

  useEffect(() => {
    loadInvoiceLayout().then((L) => {
      setLayout(L)
      if (isNew) {
        setTemplateId(L.defaultTemplateId || 'standard')
        setNotes(L.defaultNotes || '')
        setPaymentNote(L.defaultPaymentNote || '')
        setAccountType(L.defaultAccountType || 'COD Account')
        setIncludeTerms(L.showTerms !== false)
        setDueDate(addDays(new Date().toISOString().slice(0, 10), L.defaultDueDays ?? 7))
      }
    }).catch(() => {})
  }, [isNew])

  useEffect(() => {
    if (!isNew || !ticketParam) return
    let cancelled = false
    ;(async () => {
      try {
        const all = await db.getAll(STORES.tickets)
        const tix = (all || []).find((x) => String(x.id) === String(ticketParam))
        if (!tix || cancelled) return
        setTicketId(tix.id)
        if (tix.clientId) setClientId(String(tix.clientId))
        if (tix.supportType === 'onsite') setAccountType('On-site (call-out)')
        else if (tix.supportType === 'remote') setAccountType('Remote support')
        else if (tix.supportType === 'workshop') setAccountType('Workshop drop-off')
        setServiceType(tix.supportType || tix.category || '')
        setDevices(tix.devices || tix.device || '')
        setSerials(tix.serials || tix.serialNumbers || '')
        setSiteAddress(tix.siteAddress || tix.address || '')
        setTechnician(tix.assignee || tix.technician || '')
        const desc = [tix.title || tix.subject, tix.workDone || tix.description || tix.notes].filter(Boolean).join(' — ')
        const labour = Number(tix.labourAmount || tix.amount || 0)
        if (desc) setLines([{ description: desc.slice(0, 500), qty: 1, price: labour || 0 }])
        setNotes([tix.notes, tix.workDone ? `Work done: ${tix.workDone}` : '', `Job ref: ${tix.number || tix.id}`].filter(Boolean).join('\n'))
        if (tix.clientSignature) setClientSignature(tix.clientSignature)
        toast?.('Job loaded into invoice', 'success')
      } catch (e) { console.warn(e) }
    })()
    return () => { cancelled = true }
  }, [isNew, ticketParam])

  useEffect(() => {
    if (!existing) return
    setClientId(existing.clientId || '')
    setDate((existing.date || '').slice(0, 10) || date)
    setDueDate((existing.dueDate || '').slice(0, 10))
    setStatus(existing.status || 'unpaid')
    setNotes(existing.notes || '')
    setTemplateId(existing.templateId || 'standard')
    setDevices(existing.devices || '')
    setServiceType(existing.serviceType || '')
    setAccountType(existing.accountType || 'COD Account')
    setPoNumber(existing.poNumber || existing.orderRef || '')
    setSiteAddress(existing.siteAddress || '')
    setTechnician(existing.technician || '')
    setSerials(existing.serials || existing.serialNumbers || '')
    setIntro(existing.intro || '')
    setPaymentNote(existing.paymentNote || '')
    setIncludeTerms(existing.includeTerms !== false)
    setLines(existing.lines?.length ? existing.lines : [{ description: '', qty: 1, price: 0 }])
    setClientSignature(existing.clientSignature || '')
    setTicketId(existing.ticketId || '')
  }, [existing])

  const totals = useMemo(() => invoiceTotals(lines, vatRate, vatEnabled), [lines, vatRate, vatEnabled])
  const paidSum = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || Number(existing?.amountPaid) || 0
  const balance = Math.max(0, totals.total - paidSum)
  const client = clients.find((c) => String(c.id) === String(clientId))
  const invNumber = existing?.number || `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`

  const addLine = () => setLines((L) => [...L, { description: '', qty: 1, price: 0 }])
  const setLine = (i, patch) => setLines((L) => L.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const removeLine = (i) => setLines((L) => L.filter((_, idx) => idx !== i))

  const saveClientInline = async () => {
    if (!newClient.name.trim()) return toast('Client name required', 'error')
    const c = await db.add(STORES.clients, { ...newClient, name: newClient.name.trim() })
    await refresh()
    setClientId(c.id)
    setShowClient(false)
    toast('Client added', 'success')
  }

  const catalog = [...(products || []), ...(services || [])]

  const buildPayload = () => {
    const amountPaid = status === 'paid' ? totals.total : paidSum
    return {
      ...(existing || {}),
      clientId,
      number: invNumber,
      date,
      dueDate: dueDate || date,
      status,
      notes,
      templateId,
      devices,
      serviceType,
      accountType,
      poNumber,
      orderRef: poNumber,
      siteAddress,
      technician,
      serials,
      serialNumbers: serials,
      intro,
      paymentNote,
      includeTerms,
      ticketId: ticketId || undefined,
      clientSignature: clientSignature || undefined,
      layoutSnapshot: {
        headerStyle: layout.headerStyle,
        accentHex: layout.accentHex,
        pdfFontSize: layout.pdfFontSize,
        showClientGrid: layout.showClientGrid,
        showTerms: includeTerms && layout.showTerms,
        showAcceptance: layout.showAcceptance,
        showBankDetails: layout.showBankDetails,
        footerText: layout.footerText,
        marginMm: layout.marginMm,
      },
      lines,
      exclusive: totals.exclusive,
      vatAmount: totals.vat,
      total: totals.total,
      amountPaid,
      amountDue: Math.max(0, totals.total - amountPaid),
      companyName: company?.name,
      updatedAt: new Date().toISOString(),
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!clientId) return toast('Select a client', 'error')
    const payload = buildPayload()
    if (isNew) await db.add(STORES.invoices, payload)
    else {
      payload.id = existing.id
      await db.put(STORES.invoices, payload)
    }
    await refresh()
    if (Sync.isLoggedIn()) {
      try {
        const c = clients.find((x) => String(x.id) === String(clientId)) || {}
        await Sync.pushInvoiceStatus(Sync.statusFromInvoice(payload, c))
      } catch (err) {
        console.warn('status push', err)
      }
    }
    toast('Invoice saved', 'success')
    nav('/invoices')
  }

  const doPdf = async (open) => {
    try {
      const payload = existing ? { ...existing, ...buildPayload(), id: existing.id } : buildPayload()
      const opts = { company, client, payments: invPayments, isQuote: false, templateId: payload.templateId || templateId, accountType, layout }
      if (open) await openProfessionalPdf(payload, opts)
      else await downloadProfessionalPdf(payload, opts)
      toast(open ? 'Preview opened' : 'PDF downloaded', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const gap = layout.formDensity === 'compact' ? 6 : layout.formDensity === 'spacious' ? 14 : 10

  const shareWhatsApp = () => {
    const c = clients.find((x) => String(x.id) === String(clientId))
    const phone = String(c?.phone || '').replace(/\D/g, '')
    const text = encodeURIComponent(
      `Hi${c?.name ? ' ' + c.name : ''}, please find tax invoice ${invNumber} for ${formatMoney(totals.total)} (balance due ${formatMoney(balance)}). Thank you — ${company?.name || 'SA Invoice Pro'}.`
    )
    const url = phone
      ? `https://wa.me/${phone.startsWith('0') ? '27' + phone.slice(1) : phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const shareEmail = () => {
    const c = clients.find((x) => String(x.id) === String(clientId))
    const subject = encodeURIComponent(`Tax invoice ${invNumber} — ${company?.name || 'SA Invoice Pro'}`)
    const body = encodeURIComponent(
      `Dear ${c?.name || 'Client'},\n\nPlease find tax invoice ${invNumber}.\nTotal: ${formatMoney(totals.total)}\nBalance due: ${formatMoney(balance)}\nDue: ${dueDate || 'on receipt'}\n\nRegards,\n${company?.name || ''}`
    )
    window.location.href = `mailto:${c?.email || ''}?subject=${subject}&body=${body}`
  }

  return (
    <div className="inv-page" style={{ fontSize: layout.formFontSize || 14 }}>
      <div className="page-header">
        <div>
          <h1>{isNew ? 'New invoice' : invNumber}</h1>
          <p className="subtitle">{company?.name || 'SA Invoice Pro'} · ZAR · VAT {vatEnabled ? `${(vatRate * 100).toFixed(0)}%` : 'off'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/invoices')}>Back</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(true)}>Preview PDF</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(false)}>Download</button>
          <button type="button" className="btn btn-outline" onClick={shareWhatsApp}>WhatsApp</button>
          <button type="button" className="btn btn-outline" onClick={shareEmail}>Email</button>
        </div>
      </div>

      <div className="inv-chips">
        <div className="inv-chip"><div className="k">Number</div><div className="v">{invNumber}</div></div>
        <div className="inv-chip"><div className="k">Status</div><div className="v" style={{ textTransform: 'capitalize' }}>{status}</div></div>
        <div className="inv-chip accent"><div className="k">Total</div><div className="v">{formatMoney(totals.total)}</div></div>
        <div className="inv-chip"><div className="k">Balance due</div><div className="v">{formatMoney(balance)}</div></div>
      </div>

      <form onSubmit={save}>
        <div className="inv-two" style={{ marginBottom: gap }}>
          <div className="inv-block">
            <div className="inv-block-head"><h3>From</h3></div>
            <strong>{company?.name || '—'}</strong>
          </div>
          <div className="inv-block">
            <div className="inv-block-head"><h3>Bill to</h3></div>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setShowClient((s) => !s)}>
              {showClient ? 'Hide' : '+ New client'}
            </button>
            {showClient && (
              <div className="form-grid" style={{ marginTop: 8, gap: 6 }}>
                <input className="input" placeholder="Name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                <input className="input" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                <input className="input" placeholder="Phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={saveClientInline}>Save client</button>
              </div>
            )}
          </div>
        </div>

        <div className="inv-block">
          <div className="inv-block-head"><h3>Dates & status</h3></div>
          <div className="form-grid cols-3" style={{ gap }}>
            <div><label className="label">Invoice date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className="label">Due date</label><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Style</label>
              <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {TEMPLATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Account / engagement</label>
              <select className="select" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                {ACCOUNT_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Service mode</label>
              <select className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="">—</option>
                {SUPPORT_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="inv-block">
          <div className="inv-block-head">
            <h3>Line items</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>+ Add line</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="inv-line-row inv-line-row-catalog">
              <div className="inv-line-catalog">
                <select
                  className="select input"
                  value={line.productId || ''}
                  aria-label="Product or service"
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) { setLine(i, { productId: '' }); return }
                    const item = catalog.find((x) => String(x.id) === String(id))
                    if (item) {
                      setLine(i, {
                        productId: item.id,
                        description: item.name || item.description || '',
                        price: Number(item.price) || 0,
                        qty: line.qty || 1,
                      })
                    }
                  }}
                >
                  <option value="">— Product / service —</option>
                  {(products || []).length > 0 && (
                    <optgroup label="Products">
                      {(products || []).map((pr) => (
                        <option key={`p-${pr.id}`} value={pr.id}>
                          {pr.name || pr.description || 'Product'} · R{Number(pr.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(services || []).length > 0 && (
                    <optgroup label="Services">
                      {(services || []).map((sv) => (
                        <option key={`s-${sv.id}`} value={sv.id}>
                          {sv.name || sv.description || 'Service'} · R{Number(sv.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Description (or pick above)"
                  value={line.description}
                  onChange={(e) => setLine(i, { description: e.target.value })}
                  required
                />
              </div>
              <input className="input" type="number" step="0.01" value={line.qty} onChange={(e) => setLine(i, { qty: e.target.value })} aria-label="Qty" />
              <input className="input" type="number" step="0.01" value={line.price} onChange={(e) => setLine(i, { price: e.target.value })} aria-label="Price" />
              {lines.length > 1 ? <button type="button" className="btn btn-outline btn-sm" onClick={() => removeLine(i)}>×</button> : null}
            </div>
          ))}
          <div className="inv-totals" style={{ marginTop: 12 }}>
            <div className="row"><span>Exclusive</span><span>{formatMoney(totals.exclusive)}</span></div>
            <div className="row"><span>VAT</span><span>{formatMoney(totals.vat)}</span></div>
            <div className="row grand"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
          </div>
        </div>

        <div className="inv-block">
          <label className="label">Notes</label>
          <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {client ? (
          <div className="inv-block">
            <PortalCard client={client} company={company} invoices={invoices} toast={toast} compact />
          </div>
        ) : null}

        <div className="inv-block">
          <SignaturePad label="Client acceptance signature (optional)" value={clientSignature} onChange={setClientSignature} />
          {ticketId ? <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Linked job: {ticketId}</p> : null}
        </div>

        <button type="submit" className="btn btn-primary">Save invoice</button>
      </form>
    </div>
  )
}
