import React, { useMemo, useState } from 'react'
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
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatusBadge, formatDateZA,
} from '../components/ui'

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
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(() => {
    return quotes.filter((qt) => {
      const c = clients.find((x) => String(x.id) === String(qt.clientId))
      return matchesQuery(
        { ...qt, clientName: c?.name || '' },
        q,
        ['number', 'status', 'clientName', 'templateId', 'devices', 'serviceType']
      )
    })
  }, [quotes, clients, q])

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

  const pdf = async (qt, open) => {
    try {
      const client = clients.find((c) => String(c.id) === String(qt.clientId))
      const payload = { ...qt, isQuote: true }
      const opts = { company, client, isQuote: true, templateId: qt.templateId || 'standard', accountType: qt.accountType }
      if (open) await openProfessionalPdf(payload, opts)
      else await downloadProfessionalPdf(payload, opts)
      toast(open ? 'Preview opened' : 'PDF downloaded', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const convert = async (qt) => {
    const inv = {
      clientId: qt.clientId,
      number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'unpaid',
      lines: qt.lines || [],
      exclusive: qt.exclusive,
      vatAmount: qt.vatAmount,
      total: qt.total,
      amountPaid: 0,
      amountDue: qt.total,
      fromQuoteId: qt.id,
      templateId: qt.templateId === 'adhoc' || qt.templateId === 'hourly' || qt.templateId === 'flatrate' ? 'standard' : qt.templateId,
      devices: qt.devices,
      serviceType: qt.serviceType,
      accountType: qt.accountType,
      notes: qt.notes || '',
    }
    await db.add(STORES.invoices, inv)
    await db.put(STORES.quotes, { ...qt, status: 'converted' })
    await refresh()
    toast('Converted to invoice', 'success')
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
        toast('Deleted', 'success')
        setConfirm(null)
      },
    })
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <p className="subtitle">
            Professional COD templates · hourly · flat-rate · ad-hoc · {quotes.length} total
          </p>
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

      <div className="toolbar sticky-tools">
        <SearchInput value={q} onChange={setQ} placeholder="Search number, client, status…" />
      </div>

      {!filtered.length ? (
        <EmptyState
          title={quotes.length ? 'No matches' : 'No quotes yet'}
          hint={quotes.length ? 'Try another search.' : 'Load a demo rate card or enter a single amount.'}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
          .map((qt) => {
            const c = clients.find((x) => String(x.id) === String(qt.clientId))
            return (
              <div key={qt.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong>{qt.number}</strong> · {c?.name || '—'}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(qt.total)} · <StatusBadge status={qt.status || 'draft'} /> · {qt.templateId || 'standard'}
                    {qt.date ? ` · ${formatDateZA(qt.date)}` : ''}
                    {qt.devices ? ` · ${qt.devices}` : ''}
                  </div>
                </div>
                <div className="list-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(qt, true)}>Preview</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => pdf(qt, false)}>PDF</button>
                  {qt.status !== 'converted' && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => convert(qt)}>To invoice</button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(qt.id)}>Delete</button>
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
