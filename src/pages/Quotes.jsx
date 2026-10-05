
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import {
  downloadProfessionalPdf,
  openProfessionalPdf,
  TEMPLATE_PRESETS,
  demoAdhocLines,
  demoHourlyLines,
  demoFlatLines,
} from '../lib/pdfTemplate'

export default function Quotes() {
  const { quotes, clients, invoices, company, vatRate, vatEnabled, refresh, toast } = useApp()
  const [clientId, setClientId] = useState('')
  const [templateId, setTemplateId] = useState('adhoc')
  const [devices, setDevices] = useState('2 × Laptops · 1 × Desktop')
  const [serviceType, setServiceType] = useState('Apps + Drivers Installation · On-site or Workshop')
  const [accountType, setAccountType] = useState('COD Account')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [lines, setLines] = useState([])

  const loadDemoRates = () => {
    if (templateId === 'hourly') setLines(demoHourlyLines())
    else if (templateId === 'flatrate') setLines(demoFlatLines())
    else setLines(demoAdhocLines())
    toast('Demo rate card loaded — edit before saving', 'success')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!clientId) return toast('Select client', 'error')
    const useLines =
      lines.length > 0
        ? lines.map((l) => ({
            description: l.description || l.name,
            qty: l.qty != null ? l.qty : 1,
            price: Number(l.price) || 0,
            unit: l.unit,
            typicalUse: l.typicalUse || l.notes,
          }))
        : [{ description: description || 'Quotation', qty: 1, price: Number(amount) || 0 }]
    const t = invoiceTotals(
      useLines.map((l) => ({ qty: l.qty, price: l.price })),
      vatRate,
      vatEnabled
    )
    const exampleRows =
      templateId === 'adhoc'
        ? useLines.slice(0, 4).map((l) => ({
            description: l.description,
            qty: 3,
            rate: l.price,
            amount: 3 * (Number(l.price) || 0),
          }))
        : null
    const exampleTotal = exampleRows
      ? exampleRows.reduce((s, r) => s + r.amount, 0)
      : null
    await db.add(STORES.quotes, {
      clientId,
      number: `QT-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'draft',
      templateId,
      devices,
      serviceType,
      accountType,
      lines: useLines,
      exclusive: t.exclusive,
      vatAmount: t.vat,
      total: t.total,
      exampleRows,
      exampleTotal,
      isQuote: true,
      includeTerms: true,
    })
    setDescription('')
    setAmount('')
    await refresh()
    toast('Quote saved', 'success')
  }

  const pdf = async (q, open) => {
    try {
      const client = clients.find((c) => String(c.id) === String(q.clientId))
      const payload = { ...q, isQuote: true }
      const opts = { company, client, isQuote: true, templateId: q.templateId || 'standard', accountType: q.accountType }
      if (open) await openProfessionalPdf(payload, opts)
      else await downloadProfessionalPdf(payload, opts)
      toast(open ? 'Preview opened' : 'PDF downloaded', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const convert = async (q) => {
    const inv = {
      clientId: q.clientId,
      number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'unpaid',
      lines: q.lines || [],
      exclusive: q.exclusive,
      vatAmount: q.vatAmount,
      total: q.total,
      amountPaid: 0,
      amountDue: q.total,
      fromQuoteId: q.id,
      templateId: q.templateId === 'adhoc' || q.templateId === 'hourly' || q.templateId === 'flatrate' ? 'standard' : q.templateId,
      devices: q.devices,
      serviceType: q.serviceType,
      accountType: q.accountType,
      notes: q.notes || '',
    }
    await db.add(STORES.invoices, inv)
    await db.put(STORES.quotes, { ...q, status: 'converted' })
    await refresh()
    toast('Converted to invoice', 'success')
  }

  const del = async (id) => {
    if (!confirm('Delete quote?')) return
    await db.remove(STORES.quotes, id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <p className="subtitle">Professional COD templates · hourly · flat-rate · ad-hoc rate card</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={loadDemoRates}>Load demo rate card</button>
      </div>
      <form className="card form-grid" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div className="form-grid cols-2">
          <div>
            <label className="label">Client</label>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Template</label>
            <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {TEMPLATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Devices</label>
            <input className="input" value={devices} onChange={(e) => setDevices(e.target.value)} />
          </div>
          <div>
            <label className="label">Service type</label>
            <input className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} />
          </div>
          <div>
            <label className="label">Account type</label>
            <input className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)} />
          </div>
        </div>
        {!lines.length && (
          <div className="form-grid cols-2">
            <input className="input" placeholder="Single-line description (or load demo rates)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="input" type="number" step="0.01" placeholder="Amount excl." value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        {!!lines.length && (
          <div className="card" style={{ background: 'var(--bg)' }}>
            <div className="muted" style={{ marginBottom: 8 }}>{lines.length} rate lines loaded</div>
            {lines.slice(0, 6).map((l, i) => (
              <div key={i} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{l.description}</span>
                <strong>{formatMoney(l.price)}</strong>
              </div>
            ))}
            {lines.length > 6 && <div className="muted">+{lines.length - 6} more…</div>}
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setLines([])}>Clear lines</button>
          </div>
        )}
        <button className="btn btn-primary" type="submit">Save quote</button>
      </form>
      {quotes.map((q) => {
        const c = clients.find((x) => String(x.id) === String(q.clientId))
        return (
          <div key={q.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <strong>{q.number}</strong> · {c?.name || '—'}
              <div className="muted" style={{ fontSize: 13 }}>
                {formatMoney(q.total)} · {q.status} · {q.templateId || 'standard'}
                {q.devices ? ` · ${q.devices}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(q, true)}>Preview</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => pdf(q, false)}>PDF</button>
              {q.status !== 'converted' && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => convert(q)}>To invoice</button>
              )}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => del(q.id)}>Del</button>
            </div>
          </div>
        )
      })}
      {!quotes.length && <div className="card empty">No quotes yet. Load a demo rate card or enter a single amount.</div>}
    </div>
  )
}
