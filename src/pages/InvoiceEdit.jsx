import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney, invoiceTotals } from '../lib/money'
import { downloadProfessionalPdf, openProfessionalPdf, TEMPLATE_PRESETS } from '../lib/pdfTemplate'
import { loadInvoiceLayout, DEFAULT_LAYOUT } from '../lib/invoiceLayout'

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
  }, [existing])

  const totals = useMemo(() => invoiceTotals(lines, vatRate, vatEnabled), [lines, vatRate, vatEnabled])
  const paidSum = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || Number(existing?.amountPaid) || 0
  const balance = Math.max(0, totals.total - paidSum)
  const client = clients.find((c) => String(c.id) === String(clientId))
  const invNumber = existing?.number || `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`

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

  const catalog = [...(products || []), ...(services || [])]
  const gap = layout.formDensity === 'compact' ? 6 : layout.formDensity === 'spacious' ? 14 : 10

  return (
    <div className="inv-page" style={{ fontSize: layout.formFontSize || 14 }}>
      <div className="page-header">
        <div>
          <h1>{isNew ? 'New invoice' : invNumber}</h1>
          <p className="subtitle">{company?.name || 'SA Invoice Pro'} · ZAR · VAT {vatEnabled ? `${(vatRate * 100).toFixed(0)}%` : 'off'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/invoices')}>Back</button>
          <button type="button" className="btn btn-outline" onClick={() => nav('/settings')}>Invoice preferences</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(true)}>Preview PDF</button>
          <button type="button" className="btn btn-secondary" onClick={() => doPdf(false)}>Download</button>
        </div>
      </div>

      <div className="inv-chips">
        <div className="inv-chip"><div className="k">Number</div><div className="v">{invNumber}</div></div>
        <div className="inv-chip"><div className="k">Status</div><div className="v" style={{ textTransform: 'capitalize' }}>{status}</div></div>
        <div className="inv-chip accent"><div className="k">Total</div><div className="v">{formatMoney(totals.total)}</div></div>
        <div className="inv-chip"><div className="k">Balance due</div><div className="v">{formatMoney(balance)}</div></div>
      </div>

      {existing && (existing.fromQuoteId || existing.fromTicketId || existing.ticketId || (existing.notes && String(existing.notes).includes('Job card'))) && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green)' }}>
          <strong>Template pre-filled</strong>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            {existing.fromQuoteId
              ? 'Converted from a quote — lines and notes carried over. Review due date, save, then PDF/share.'
              : 'Converted from a job card — client, site, technician and lines included. Review and send.'}
          </p>
        </div>
      )}

      <form onSubmit={save}>
        <div className="inv-two" style={{ marginBottom: gap }}>
          <div className="inv-block">
            <div className="inv-block-head"><h3>From</h3><span className="hint">Your business</span></div>
            <strong>{company?.name || '—'}</strong>
            <div className="muted" style={{ marginTop: 6, fontSize: '0.88rem', lineHeight: 1.45 }}>
              {[company?.address, company?.email, company?.phone, company?.vatNumber && `VAT ${company.vatNumber}`].filter(Boolean).join(' · ') || 'Set company details in Settings'}
            </div>
          </div>
          <div className="inv-block">
            <div className="inv-block-head"><h3>Bill to</h3><span className="hint">Client</span></div>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {client && (
              <div className="muted" style={{ marginTop: 8, fontSize: '0.88rem' }}>
                {[client.email, client.phone, client.address].filter(Boolean).join(' · ')}
              </div>
            )}
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
              <label className="label">Style / package</label>
              <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {TEMPLATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Account type</label>
              <input className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)} placeholder="COD / 30 days…" />
            </div>
          </div>
        </div>

        {layout.showJobBlock !== false && (
          <div className="inv-block">
            <div className="inv-block-head"><h3>Job details</h3><span className="hint">Shows on PDF where enabled</span></div>
            <div className="form-grid cols-2" style={{ gap }}>
              {layout.showPo !== false && (
                <div><label className="label">PO / order ref</label><input className="input" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-1042" /></div>
              )}
              {layout.showDevices !== false && (
                <div><label className="label">Devices</label><input className="input" value={devices} onChange={(e) => setDevices(e.target.value)} placeholder="2× laptop · 1× desktop" /></div>
              )}
              {layout.showServiceType !== false && (
                <div><label className="label">Service type</label><input className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Drivers + Office install" /></div>
              )}
              {layout.showTech !== false && (
                <div><label className="label">Technician</label><input className="input" value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Name on site" /></div>
              )}
              {layout.showSite !== false && (
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Site address</label><input className="input" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Where work was done" /></div>
              )}
              {layout.showSerials !== false && (
                <div style={{ gridColumn: '1 / -1' }}><label className="label">Serial / asset numbers</label><input className="input" value={serials} onChange={(e) => setSerials(e.target.value)} placeholder="SN… · Asset…" /></div>
              )}
            </div>
          </div>
        )}

        <div className="inv-block">
          <div className="inv-block-head">
            <h3>Line items</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>+ Add line</button>
          </div>
          <div className="inv-lines-head"><span>Description</span><span>Qty</span><span>Price</span><span /></div>
          {lines.map((line, i) => (
            <div key={i} className="inv-line-row">
              <div className="desc">
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
              <input className="input" type="number" step="0.01" value={line.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              <input className="input" type="number" step="0.01" value={line.price} onChange={(e) => setLine(i, { price: e.target.value })} />
              {lines.length > 1 ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => removeLine(i)}>×</button>
              ) : <span />}
            </div>
          ))}
          <div className="inv-totals" style={{ marginTop: 12 }}>
            <div className="row"><span>Exclusive</span><span>{formatMoney(totals.exclusive)}</span></div>
            <div className="row"><span>VAT</span><span>{formatMoney(totals.vat)}</span></div>
            <div className="row grand"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
            {paidSum > 0 && (
              <>
                <div className="row"><span>Paid</span><span>{formatMoney(paidSum)}</span></div>
                <div className="row"><span>Balance</span><strong>{formatMoney(balance)}</strong></div>
              </>
            )}
          </div>
        </div>

        {layout.showPaymentBlock !== false && (
          <div className="inv-block">
            <div className="inv-block-head"><h3>Payment & wording</h3></div>
            <div className="form-grid" style={{ gap }}>
              <div>
                <label className="label">Intro (on PDF)</label>
                <textarea className="textarea" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Optional short intro…" />
              </div>
              <div>
                <label className="label">Payment note</label>
                <textarea className="textarea" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
              </div>
              <div>
                <label className="label">Notes on invoice</label>
                <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={includeTerms} onChange={(e) => setIncludeTerms(e.target.checked)} />
                Include terms & acceptance on PDF
              </label>
            </div>
          </div>
        )}

        {layout.showBankBlock !== false && (company?.bankName || company?.accountNumber) && (
          <div className="inv-block">
            <div className="inv-block-head"><h3>Bank details</h3><span className="hint">From company settings</span></div>
            <div style={{ fontSize: '0.92rem' }}>
              {[company.bankName, company.accountNumber && `Acc ${company.accountNumber}`, company.branchCode && `Branch ${company.branchCode}`].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        {!!invPayments.length && (
          <div className="inv-block">
            <div className="inv-block-head"><h3>Payments logged</h3></div>
            {invPayments.map((p) => (
              <div key={p.id} className="muted" style={{ fontSize: 13 }}>{(p.date || '').slice(0, 10)} · {formatMoney(p.amount)} · {p.method}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <button type="submit" className="btn btn-primary">Save invoice</button>
          <button type="button" className="btn btn-outline" onClick={() => doPdf(true)}>Preview PDF</button>
        </div>
      </form>
    </div>
  )
}
