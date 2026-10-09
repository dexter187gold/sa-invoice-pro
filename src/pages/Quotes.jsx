import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatusBadge,
  formatDateZA, FilterChips, downloadCsv, daysOverdue,
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
  const [status, setStatus] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const counts = useMemo(() => {
    const c = { all: quotes.length, draft: 0, converted: 0, accepted: 0, expired: 0 }
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
        ['number', 'status', 'clientName', 'templateId', 'devices', 'serviceType']
      )
    })
  }, [quotes, clients, q, status])

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
      notes: [serviceType, devices].filter(Boolean).join(' · '),
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
    if (String(qt.status || '').toLowerCase() === 'converted') {
      return toast('Already converted', 'error')
    }
    const notesParts = [
      qt.notes || '',
      qt.serviceType ? `Service: ${qt.serviceType}` : '',
      qt.devices ? `Devices: ${qt.devices}` : '',
      `Converted from quote ${qt.number || qt.id}`,
    ].filter(Boolean)
    const inv = {
      clientId: qt.clientId,
      number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'unpaid',
      lines: (qt.lines || []).map((l) => ({
        description: l.description || l.name || 'Line',
        qty: l.qty != null ? l.qty : 1,
        price: Number(l.price) || 0,
        unit: l.unit,
      })),
      exclusive: qt.exclusive,
      vatAmount: qt.vatAmount,
      total: qt.total,
      amountPaid: 0,
      amountDue: qt.total,
      fromQuoteId: qt.id,
      templateId: ['adhoc', 'hourly', 'flatrate'].includes(qt.templateId) ? 'standard' : (qt.templateId || 'standard'),
      devices: qt.devices,
      serviceType: qt.serviceType,
      accountType: qt.accountType,
      notes: notesParts.join('\n'),
    }
    await db.add(STORES.invoices, inv)
    await db.put(STORES.quotes, { ...qt, status: 'converted', convertedAt: new Date().toISOString() })
    await refresh()
    toast('Converted to invoice — open Invoices to edit & send', 'success')
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

  const exportCsv = () => {
    const headers = ['Number', 'Client', 'Date', 'Valid until', 'Status', 'Template', 'Total', 'Service', 'Devices']
    const rows = filtered.map((qt) => {
      const c = clients.find((x) => String(x.id) === String(qt.clientId))
      return [
        qt.number || '',
        c?.name || '',
        qt.date || '',
        qt.validUntil || '',
        qt.status || 'draft',
        qt.templateId || '',
        Number(qt.total) || 0,
        qt.serviceType || '',
        qt.devices || '',
      ]
    })
    downloadCsv(`quotes-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'converted', label: 'Converted', count: counts.converted },
    { id: 'accepted', label: 'Accepted', count: counts.accepted },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Quotes</h1>
          <p className="subtitle">
            COD · hourly · flat-rate · ad-hoc · {quotes.length} total · convert fills the invoice template
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <button type="button" className="btn btn-outline" onClick={loadDemoRates}>Load demo rate card</button>
        </div>
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
        <FilterChips options={chips} value={status} onChange={setStatus} />
      </div>

      {!filtered.length ? (
        <EmptyState
          title={quotes.length ? 'No matches' : 'No quotes yet'}
          hint={quotes.length ? 'Try another search or filter.' : 'Load a demo rate card or enter a single amount — convert later fills the invoice fully.'}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
          .map((qt) => {
            const c = clients.find((x) => String(x.id) === String(qt.clientId))
            const age = daysOverdue(qt.validUntil)
            const expired = age != null && age > 0 && String(qt.status || 'draft').toLowerCase() === 'draft'
            return (
              <div key={qt.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong>{qt.number}</strong> · {c?.name || '—'}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatMoney(qt.total)} · <StatusBadge status={qt.status || 'draft'} /> · {qt.templateId || 'standard'}
                    {qt.date ? ` · ${formatDateZA(qt.date)}` : ''}
                    {qt.validUntil ? ` · valid ${formatDateZA(qt.validUntil)}` : ''}
                    {expired ? <span className="text-danger"> · expired</span> : null}
                    {qt.devices ? ` · ${qt.devices}` : ''}
                  </div>
                </div>
                <div className="list-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(qt, true)}>Preview</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => pdf(qt, false)}>PDF</button>
                  {String(qt.status || '').toLowerCase() !== 'converted' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => convert(qt)}>
                      Convert to invoice
                    </button>
                  )}
                  {String(qt.status || '').toLowerCase() === 'converted' && (
                    <Link className="btn btn-outline btn-sm" to="/invoices">View invoices</Link>
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
