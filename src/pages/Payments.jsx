
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { PayFast } from '../lib/payfast'

export default function Payments() {
  const { payments, invoices, clients, refresh, toast } = useApp()
  const open = invoices.filter((i) => !i.isCredit && ['unpaid', 'partial', 'overdue'].includes(i.status))
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('EFT')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')

  const record = async (e) => {
    e.preventDefault()
    const inv = invoices.find((i) => String(i.id) === String(invoiceId))
    if (!inv) return toast('Select invoice', 'error')
    const amt = Number(amount) || 0
    if (!(amt > 0)) return toast('Amount required', 'error')
    await db.add(STORES.payments, {
      invoiceId: inv.id,
      clientId: inv.clientId,
      amount: amt,
      method,
      date,
      reference,
    })
    const paid = (Number(inv.amountPaid) || 0) + amt
    const total = Number(inv.total) || 0
    const amountDue = Math.max(0, total - paid)
    const status = amountDue <= 0.009 ? 'paid' : 'partial'
    await db.put(STORES.invoices, { ...inv, amountPaid: paid, amountDue, status })
    setAmount('')
    setReference('')
    await refresh()
    toast('Payment recorded', 'success')
  }

  const payfastCheckout = async (inv) => {
    try {
      const cfg = await PayFast.getConfig()
      if (!cfg.merchantId) return toast('Configure PayFast in Settings', 'error')
      const client = clients.find((c) => String(c.id) === String(inv.clientId))
      const due = Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0
      await PayFast.startPayment({
        amount: due,
        itemName: 'Invoice ' + (inv.number || inv.id),
        itemDescription: (client?.name || '') + ' payment',
        email: client?.email || '',
        nameFirst: (client?.name || 'Client').split(' ')[0],
        nameLast: (client?.name || '').split(' ').slice(1).join(' ') || 'Customer',
        mPaymentId: 'INV-' + inv.id,
      })
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="subtitle">Record EFT / cash · PayFast when configured</p>
        </div>
      </div>
      <form className="card form-grid cols-3" onSubmit={record} style={{ marginBottom: '1rem' }}>
        <select className="select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
          <option value="">Open invoice…</option>
          {open.map((i) => {
            const c = clients.find((x) => String(x.id) === String(i.clientId))
            return <option key={i.id} value={i.id}>{i.number} · {c?.name || ''} · {formatMoney(i.amountDue ?? i.total)}</option>
          })}
        </select>
        <input className="input" type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
          {['EFT', 'Cash', 'Card', 'PayFast', 'Other'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input" placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <button className="btn btn-primary" type="submit">Record payment</button>
      </form>
      <h3>Open invoices — PayFast</h3>
      {open.map((i) => {
        const c = clients.find((x) => String(x.id) === String(i.clientId))
        return (
          <div key={i.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <strong>{i.number}</strong> · {c?.name}
              <div className="muted">{formatMoney(i.amountDue ?? i.total)} due</div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => payfastCheckout(i)}>PayFast checkout</button>
          </div>
        )
      })}
      <h3 style={{ marginTop: '1.5rem' }}>Payment history</h3>
      {[...payments].reverse().map((p) => (
        <div key={p.id} className="list-card">
          {formatMoney(p.amount)} · {(p.date || '').slice(0, 10)} · {p.method}
          {p.reference ? ` · ${p.reference}` : ''}
        </div>
      ))}
      {!payments.length && <div className="card empty">No payments yet.</div>}
    </div>
  )
}
