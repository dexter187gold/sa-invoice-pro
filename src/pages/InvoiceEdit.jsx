
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { downloadInvoicePdf, openInvoicePdf } from '../lib/pdfInvoice'
import { downloadProfessionalPdf, openProfessionalPdf, TEMPLATE_PRESETS } from '../lib/pdfTemplate'

export default function InvoiceEdit() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { clients, invoices, products, services, payments, vatRate, vatEnabled, refresh, toast, company } = useApp()
  const nav = useNavigate()
  const existing = invoices.find((i) => String(i.id) === String(id))
  const invPayments = payments.filter((p) => String(p.invoiceId) === String(id))

  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('unpaid')
  const [notes, setNotes] = useState('')
  const [templateId, setTemplateId] = useState('standard')
  const [devices, setDevices] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [accountType, setAccountType] = useState('COD Account')
  const [lines, setLines] = useState([{ description: '', qty: 1, price: 0 }])
  const [showClient, setShowClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })

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
  })

  const doPdf = async (open) => {
    try {
      const payload = existing ? { ...existing, ...buildPayload(), id: existing.id } : buildPayload()
      const opts = { ...pdfCtx(), isQuote: false, templateId: payload.templateId || templateId, accountType }
      if (open) await openProfessionalPdf(payload, opts)
      else await downloadProfessionalPdf(payload, opts)
      toast(open ? 'Preview opened' : 'PDF downloaded', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const catalog = [...(products || []), ...(services || [])]
  const shareWhatsApp = () => {
    const c = clients.find((x) => String(x.id) === String(clientId))
    const text = encodeURIComponent(`Hi ${c?.name || ''},\nInvoice ${existing?.number || ''}\nTotal: ${formatMoney(totals.total)}\n${company?.name || ''}`)
    window.open('https://wa.me/?text=' + text, '_blank')
  }
  const shareEmail = () => {
    const c = clients.find((x) => String(x.id) === String(clientId))
    const sub = encodeURIComponent(`Invoice ${existing?.number || ''} from ${company?.name || ''}`)
    const body = encodeURIComponent(`Please find invoice details.\nTotal: ${formatMoney(totals.total)}\n`)
    window.location.href = `mailto:${c?.email || ''}?subject=${sub}&body=${body}`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isNew ? 'New invoice' : 'Edit invoice'}</h1>
          <p className="subtitle">ZAR · VAT {vatEnabled ? `${(vatRate * 100).toFixed(0)}%` : 'off'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/invoices')}>Back</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(true)}>Preview PDF</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(false)}>Download PDF</button>
        </div>
      </div>
      <form className="card form-grid" onSubmit={save}>
        <div className="form-grid cols-2">
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
          <div className="form-grid cols-2">
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
          <div className="form-grid cols-3" style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: 12 }}>
            <input className="input" placeholder="Name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            <input className="input" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            <button type="button" className="btn btn-secondary" onClick={saveClientInline}>Save client</button>
          </div>
        )}
        <div className="form-grid cols-2">
          <div>
            <label className="label">Document template</label>
            <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {TEMPLATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Account type</label>
            <input className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="COD Account" />
          </div>
          <div>
            <label className="label">Devices (optional)</label>
            <input className="input" value={devices} onChange={(e) => setDevices(e.target.value)} placeholder="e.g. 2 × Laptops · 1 × Desktop" />
          </div>
          <div>
            <label className="label">Service type (optional)</label>
            <input className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="e.g. Apps + Drivers Installation" />
          </div>
        </div>
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
            <div key={i} className="form-grid cols-3" style={{ marginBottom: 8 }}>
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
        {!!invPayments.length && (
          <div>
            <label className="label">Payments on this invoice</label>
            {invPayments.map((p) => (
              <div key={p.id} className="muted" style={{ fontSize: 13 }}>{(p.date || '').slice(0, 10)} · {formatMoney(p.amount)} · {p.method}</div>
            ))}
          </div>
        )}
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="submit" className="btn btn-primary">Save invoice</button>
          <button type="button" className="btn btn-outline" onClick={shareWhatsApp}>WhatsApp</button>
          <button type="button" className="btn btn-outline" onClick={shareEmail}>Email</button>
        </div>
      </form>
    </div>
  )
}
