import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { downloadProfessionalPdf, openProfessionalPdf, TEMPLATE_PRESETS } from '../lib/pdfTemplate'
import { loadInvoiceLayout, DEFAULT_LAYOUT } from '../lib/invoiceLayout'

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
  const [intro, setIntro] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [includeTerms, setIncludeTerms] = useState(true)
  const [lines, setLines] = useState([{ description: '', qty: 1, price: 0 }])
  const [showClient, setShowClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })
  const [layoutOpen, setLayoutOpen] = useState(true)

  useEffect(() => {
    loadInvoiceLayout().then((L) => {
      setLayout(L)
      if (isNew) {
        setTemplateId(L.defaultTemplateId || 'standard')
        setNotes(L.defaultNotes || '')
        setPaymentNote(L.defaultPaymentNote || '')
        setIncludeTerms(L.showTerms !== false)
        if (L.formDensity === 'compact') setLayoutOpen(false)
      }
    }).catch(() => {})
  }, [isNew])

  useEffect(() => {
    if (existing) {
      setClientId(existing.clientId || '')
      setDate((existing.date || '').slice(0, 10) || date)
      setDueDate((existing.dueDate || '').slice(0, 10))
      setStatus(existing.status || 'unpaid')
      setNotes(existing.notes || '')
      setTemplateId(existing.templateId || 'standard')
      setDevices(existing.devices || '')
      setServiceType(existing.serviceType || '')
      setAccountType(existing.accountType || 'COD Account')
      setIntro(existing.intro || '')
      setPaymentNote(existing.paymentNote || '')
      setIncludeTerms(existing.includeTerms !== false)
      setLines(existing.lines?.length ? existing.lines : [{ description: '', qty: 1, price: 0 }])
    }
  }, [existing])

  const totals = useMemo(() => invoiceTotals(lines, vatRate, vatEnabled), [lines, vatRate, vatEnabled])
  const paidSum = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || Number(existing?.amountPaid) || 0

  const addLine = () => setLines((L) => [...L, { description: '', qty: 1, price: 0 }])
  const setLine = (i, patch) => setLines((L) => L.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const removeLine = (i) => setLines((L) => L.filter((_, idx) => idx !== i))
  const pickCatalog = (i, item) => {
    if (!item) return
    setLine(i, { description: item.name || item.description || '', price: Number(item.price) || 0 })
  }

  const saveClientInline = async () => {
    if (!newClient.name.trim()) return toast('Client name required', 'error')
    const c = await db.add(STORES.clients, { ...newClient, name: newClient.name.trim() })
    await refresh()
    setClientId(c.id)
    setShowClient(false)
    toast('Client added', 'success')
  }

  const buildPayload = () => {
    const number = existing?.number || `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`
    const amountPaid = status === 'paid' ? totals.total : paidSum
    return {
      ...(existing || {}),
      clientId,
      number,
      date,
      dueDate: dueDate || date,
      status,
      notes,
      templateId,
      devices,
      serviceType,
      accountType,
      intro,
      paymentNote,
      includeTerms,
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
    toast('Invoice saved', 'success')
    nav('/invoices')
  }

  const pdfCtx = () => ({
    company,
    client: clients.find((c) => String(c.id) === String(clientId)),
    payments: invPayments,
    layout,
  })

  const doPdf = async (open) => {
    try {
      const payload = existing ? { ...existing, ...buildPayload(), id: existing.id } : buildPayload()
      const opts = {
        ...pdfCtx(),
        isQuote: false,
        templateId: payload.templateId || templateId,
        accountType,
        layout,
      }
      if (open) await openProfessionalPdf(payload, opts)
      else await downloadProfessionalPdf(payload, opts)
      toast(open ? 'Preview opened' : 'PDF downloaded', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const catalog = [...(products || []), ...(services || [])]
  const gap = layout.formDensity === 'compact' ? 6 : layout.formDensity === 'spacious' ? 16 : 10
  const fontSize = layout.formFontSize || 14

  return (
    <div style={{ fontSize }}>
      <div className="page-header">
        <div>
          <h1>{isNew ? 'New invoice' : 'Edit invoice'}</h1>
          <p className="subtitle">ZAR · VAT {vatEnabled ? `${(vatRate * 100).toFixed(0)}%` : 'off'} · layout: {layout.formDensity}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/invoices')}>Back</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(true)}>Preview PDF</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(false)}>Download PDF</button>
        </div>
      </div>

      {layout.showLayoutPanel !== false && (
        <div className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${layout.accentHex || '#007A4D'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <strong>Document layout</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setLayoutOpen((o) => !o)}>
                {layoutOpen ? 'Hide' : 'Show'} details
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => nav('/settings')}>
                Open Settings → Invoicing
              </button>
            </div>
          </div>
          {layoutOpen && (
            <div className="form-grid cols-2" style={{ marginTop: gap, gap }}>
              <div>
                <label className="label">Template</label>
                <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {TEMPLATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Account type</label>
                <input className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="COD Account" />
              </div>
              {layout.showDevices !== false && (
                <div>
                  <label className="label">Devices</label>
                  <input className="input" value={devices} onChange={(e) => setDevices(e.target.value)} placeholder="e.g. 2 × Laptops · 1 × Desktop" />
                </div>
              )}
              {layout.showServiceType !== false && (
                <div>
                  <label className="label">Service type</label>
                  <input className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Drivers + Office install" />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Intro paragraph (PDF)</label>
                <textarea className="textarea" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Optional intro under the client grid…" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Payment note (PDF)</label>
                <textarea className="textarea" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Override default payment wording…" />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={includeTerms} onChange={(e) => setIncludeTerms(e.target.checked)} />
                Include T&Cs + acceptance on PDF
              </label>
              <div className="muted" style={{ fontSize: 12 }}>
                Header: {layout.headerStyle} · PDF font {layout.pdfFontSize}pt · accent {layout.accentHex}
              </div>
            </div>
          )}
        </div>
      )}

      <form className="card form-grid" onSubmit={save} style={{ gap }}>
        <div className="form-grid cols-2" style={{ gap }}>
          <div>
            <label className="label">Client</label>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }} onClick={() => setShowClient((s) => !s)}>
              {showClient ? 'Hide' : '+ Add client here'}
            </button>
          </div>
          <div className="form-grid cols-2" style={{ gap }}>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Due</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        {showClient && (
          <div className="form-grid cols-3" style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 12, gap }}>
            <input className="input" placeholder="Name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            <input className="input" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            <button type="button" className="btn btn-secondary" onClick={saveClientInline}>Save client</button>
          </div>
        )}
        <div>
          <label className="label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label">Line items</label>
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>Add line</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="form-grid cols-3" style={{ marginBottom: 8, gap }}>
              <div>
                <input className="input" placeholder="Description" value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} required />
                {catalog.length > 0 && (
                  <select className="select" style={{ marginTop: 4 }} defaultValue="" onChange={(e) => {
                    const item = catalog.find((x) => String(x.id) === e.target.value)
                    pickCatalog(i, item)
                  }}>
                    <option value="">From catalog…</option>
                    {catalog.map((p) => <option key={p.id} value={p.id}>{p.name || p.description}</option>)}
                  </select>
                )}
              </div>
              <input className="input" type="number" step="0.01" placeholder="Qty" value={line.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" step="0.01" placeholder="Price" value={line.price} onChange={(e) => setLine(i, { price: e.target.value })} />
                {lines.length > 1 && <button type="button" className="btn btn-outline btn-sm" onClick={() => removeLine(i)}>×</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Exclusive</span><strong>{formatMoney(totals.exclusive)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VAT</span><strong>{formatMoney(totals.vat)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><strong>{formatMoney(totals.total)}</strong></div>
          {paidSum > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Amount paid</span><strong>{formatMoney(paidSum)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}><span>Balance due</span><span>{formatMoney(Math.max(0, totals.total - paidSum))}</span></div>
            </>
          )}
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="submit" className="btn btn-primary">Save invoice</button>
        </div>
      </form>
    </div>
  )
}
