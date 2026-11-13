import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { downloadProfessionalPdf } from '../lib/pdfTemplate'

export default function QuoteEdit() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { clients, quotes, company, vatRate, vatEnabled, refresh, toast } = useApp()
  const nav = useNavigate()
  const existing = quotes.find((q) => String(q.id) === String(id))
  const [clientId, setClientId] = useState('')
  const [number, setNumber] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ description: '', qty: 1, price: 0 }])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!existing) return
    setClientId(existing.clientId || '')
    setNumber(existing.number || '')
    setDate(existing.date || new Date().toISOString().slice(0, 10))
    setValidUntil(existing.validUntil || '')
    setNotes(existing.notes || '')
    setLines(Array.isArray(existing.lines) && existing.lines.length ? existing.lines : [{ description: '', qty: 1, price: 0 }])
  }, [existing])

  useEffect(() => {
    if (!number && isNew) setNumber(`QT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`)
  }, [number, isNew, quotes.length])

  const totals = useMemo(() => invoiceTotals(lines, vatRate, vatEnabled), [lines, vatRate, vatEnabled])
  const setLine = (index, patch) => setLines((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  const addLine = () => setLines((rows) => [...rows, { description: '', qty: 1, price: 0 }])
  const removeLine = (index) => setLines((rows) => rows.length > 1 ? rows.filter((_, i) => i !== index) : rows)

  const buildPayload = () => ({
    ...(existing || {}),
    clientId,
    number,
    date,
    validUntil,
    notes,
    status: existing?.status || 'draft',
    lines: lines.map((line) => ({ ...line, qty: Number(line.qty) || 0, price: Number(line.price) || 0 })),
    vatEnabled: !!vatEnabled,
    vatRate: Number(vatRate) || 0,
    exclusive: totals.exclusive,
    vatAmount: totals.vat,
    total: totals.total,
    updatedAt: new Date().toISOString(),
  })

  const save = async (event) => {
    event.preventDefault()
    if (!clientId) return toast('Select a client', 'error')
    if (!lines.some((line) => String(line.description || '').trim() || Number(line.price))) return toast('Add at least one quote line', 'error')
    setBusy(true)
    try {
      const payload = buildPayload()
      if (isNew) await db.add(STORES.quotes, payload)
      else await db.put(STORES.quotes, { ...payload, id: existing.id })
      await refresh()
      toast('Quote saved using the current VAT settings', 'success')
      nav('/quotes')
    } catch (error) {
      toast(error?.message || 'Quote could not be saved', 'error')
    } finally { setBusy(false) }
  }

  const downloadPdf = async () => {
    try {
      const client = clients.find((row) => String(row.id) === String(clientId)) || {}
      await downloadProfessionalPdf({ ...buildPayload(), isQuote: true, company, client }, { company, client, isQuote: true, vatEnabled: !!vatEnabled, vatRate })
      toast('Quote PDF downloaded', 'success')
    } catch (error) {
      toast(error?.message || 'Quote PDF could not be generated', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>{isNew ? 'New quote' : 'Edit quote'}</h1><p className="subtitle">{company?.name || 'SA Invoice Pro'} · VAT {vatEnabled ? `${(vatRate * 100).toFixed(2)}%` : 'off'}</p></div>
        <Link className="btn btn-outline" to="/quotes">Back to quotes</Link>
      </div>
      <form className="card form-grid" onSubmit={save}>
        <label className="label">Quote number</label>
        <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} required />
        <label className="label">Client</label>
        <select className="select input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="">Select client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}><label className="label">Quote date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 150 }}><label className="label">Valid until</label><input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
        </div>
        <h3>Quote items</h3>
        {lines.map((line, index) => <div key={index} className="card form-grid" style={{ padding: 12 }}>
          <label className="label">Description</label>
          <input className="input" value={line.description || ''} onChange={(e) => setLine(index, { description: e.target.value })} placeholder="Work or product description" />
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}><label className="label">Quantity</label><input className="input" type="number" min="0" step="0.01" value={line.qty} onChange={(e) => setLine(index, { qty: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label className="label">Unit price (excl. VAT)</label><input className="input" type="number" min="0" step="0.01" value={line.price} onChange={(e) => setLine(index, { price: e.target.value })} /></div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" disabled={lines.length === 1} onClick={() => removeLine(index)}>Remove item</button>
        </div>)}
        <button type="button" className="btn btn-outline" onClick={addLine}>Add quote item</button>
        <label className="label">Notes</label>
        <textarea className="input" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="card" style={{ padding: 12 }}>
          <div className="row"><span>Subtotal</span><strong>{formatMoney(totals.exclusive)}</strong></div>
          {vatEnabled && <div className="row"><span>VAT ({(vatRate * 100).toFixed(2)}%)</span><strong>{formatMoney(totals.vat)}</strong></div>}
          <div className="row"><strong>Quote total</strong><strong>{formatMoney(totals.total)}</strong></div>
          <p className="muted" style={{ fontSize: 12 }}>This quote uses the VAT mode saved in Settings → Look & themes.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save quote'}</button>
          <button type="button" className="btn btn-outline" onClick={downloadPdf}>Download PDF</button>
        </div>
      </form>
    </div>
  )
}
