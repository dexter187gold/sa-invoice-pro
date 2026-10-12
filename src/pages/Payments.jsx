import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { PayFast } from '../lib/payfast'
import {
  SearchInput, EmptyState, matchesQuery, formatDateZA, relativeTime, PageFade, StatCard, StatusBadge, downloadCsv, ConfirmDialog, FilterChips, CopyButton,
} from '../components/ui'
import { openWhatsApp, openEmail, buildOverdueReminder } from '../lib/share'

function buildReceipt(p, inv, client, company) {
  const co = company?.name || 'SA Invoice Pro'
  return [
    `*Payment receipt — ${co}*`,
    '',
    `Amount: *R${(Number(p.amount) || 0).toFixed(2)}*`,
    `Date: ${String(p.date || '').slice(0, 10)}`,
    `Method: ${p.method || '—'}`,
    p.reference ? `Reference: ${p.reference}` : '',
    inv?.number ? `Invoice: ${inv.number}` : '',
    client?.name ? `Client: ${client.name}` : '',
    '',
    `Thank you — ${co}`,
  ].filter(Boolean).join('\n')
}

export default function Payments() {
  const { payments, invoices, clients, company, refresh, toast } = useApp()
  const open = invoices.filter((i) => !i.isCredit && ['unpaid', 'partial', 'overdue'].includes(i.status))
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('EFT')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [q, setQ] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const openDue = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const paidToday = payments.filter((p) => String(p.date || '').slice(0, 10) === today)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const methodCounts = useMemo(() => {
    const c = { all: payments.length }
    for (const p of payments) {
      const m = p.method || 'Other'
      c[m] = (c[m] || 0) + 1
    }
    return c
  }, [payments])

  const filteredHistory = useMemo(() => {
    let rows = [...payments].reverse()
    if (methodFilter !== 'all') rows = rows.filter((p) => (p.method || 'Other') === methodFilter)
    if (!q.trim()) return rows
    return rows.filter((p) => {
      const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
      const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
      return matchesQuery(
        { ...p, invNumber: inv?.number || '', clientName: client?.name || '' },
        q,
        ['method', 'reference', 'invNumber', 'clientName']
      )
    })
  }, [payments, invoices, clients, q, methodFilter])

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

  const markFullyPaid = async (inv) => {
    const due = Number(inv.amountDue ?? inv.total) || 0
    if (due <= 0) return toast('Nothing due', 'info')
    await db.add(STORES.payments, {
      invoiceId: inv.id,
      clientId: inv.clientId,
      amount: due,
      method: 'EFT',
      date: new Date().toISOString().slice(0, 10),
      reference: 'Full balance',
    })
    await db.put(STORES.invoices, {
      ...inv,
      amountPaid: Number(inv.total) || 0,
      amountDue: 0,
      status: 'paid',
      paidAt: new Date().toISOString(),
    })
    await refresh()
    toast(`Marked ${inv.number} paid`, 'success')
  }

  const sendReceipt = (p, channel) => {
    const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
    const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
    const text = buildReceipt(p, inv, client, company)
    if (channel === 'wa') {
      const ok = openWhatsApp(client?.phone, text)
      toast(ok ? 'Opening WhatsApp receipt…' : 'No phone — pick contact in WhatsApp', ok ? 'success' : 'info')
    } else {
      const ok = openEmail(client?.email, `Payment receipt — ${company?.name || 'SA Invoice Pro'}`, text.replace(/\*/g, ''))
      toast(ok ? 'Opening email receipt…' : 'No email on client', ok ? 'success' : 'info')
    }
  }

  const remindOpen = (inv, channel) => {
    const client = clients.find((c) => String(c.id) === String(inv.clientId))
    const text = buildOverdueReminder(inv, client, company)
    if (channel === 'wa') {
      openWhatsApp(client?.phone, text)
      toast('Opening reminder…', 'success')
    } else {
      openEmail(client?.email, `Payment reminder — ${inv.number}`, text.replace(/\*/g, ''))
      toast('Opening email…', 'success')
    }
  }

  const delPayment = (p) => {
    setConfirm({
      title: 'Delete payment?',
      message: 'This removes the payment log only. Invoice balances are not auto-reversed — edit the invoice if needed.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.payments, p.id)
        await refresh()
        toast('Payment deleted', 'success')
        setConfirm(null)
      },
    })
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

  const fillFromInvoice = (id) => {
    setInvoiceId(id)
    const inv = invoices.find((i) => String(i.id) === String(id))
    if (inv) setAmount(String(Number(inv.amountDue ?? inv.total) || ''))
  }

  const exportCsv = () => {
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Amount', 'Method', 'Reference', 'Invoice', 'Client'],
      filteredHistory.map((p) => {
        const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
        const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
        return [p.date || '', Number(p.amount) || 0, p.method || '', p.reference || '', inv?.number || '', client?.name || '']
      })
    )
    toast('CSV exported', 'success')
  }

  const methodChips = [
    { id: 'all', label: 'All', count: methodCounts.all },
    ...['EFT', 'Cash', 'Card', 'PayFast', 'Other'].map((m) => ({
      id: m, label: m, count: methodCounts[m] || 0,
    })),
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="subtitle">Record · receipts · reminders · history actions</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filteredHistory.length}>Export CSV</button>
          <Link className="btn btn-secondary" to="/invoices">Invoices</Link>
          <Link className="btn btn-outline" to="/reports">Reports</Link>
          <Link className="btn btn-outline" to="/clients">Clients</Link>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Total collected" value={formatMoney(totalPaid)} tone="good" />
        <StatCard label="Paid today" value={formatMoney(paidToday)} tone="good" />
        <StatCard label="Still due" value={formatMoney(openDue)} tone={openDue > 0 ? 'warn' : 'good'} hint={`${open.length} open`} />
        <StatCard label="Payments logged" value={payments.length} />
      </div>

      <form className="card form-grid cols-3" onSubmit={record} style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Open invoice</label>
          <select className="select" value={invoiceId} onChange={(e) => fillFromInvoice(e.target.value)} required>
            <option value="">Select…</option>
            {open.map((i) => {
              const c = clients.find((x) => String(x.id) === String(i.clientId))
              return (
                <option key={i.id} value={i.id}>
                  {i.number} · {c?.name || ''} · {formatMoney(i.amountDue ?? i.total)}
                </option>
              )
            })}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {['EFT', 'Cash', 'Card', 'PayFast', 'Other'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Reference</label>
          <input className="input" placeholder="Bank ref / note" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" type="submit">Record payment</button>
        </div>
      </form>

      <h3 style={{ marginTop: 0 }}>Open invoices — collect / remind</h3>
      {!open.length && (
        <EmptyState title="No open invoices" hint="All clear." action={<Link className="btn btn-primary btn-sm" to="/invoices/new">New invoice</Link>} />
      )}
      {open.map((i) => {
        const c = clients.find((x) => String(x.id) === String(i.clientId))
        return (
          <div key={i.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <strong>{i.number}</strong> · {c?.name || '—'}
              <div className="muted" style={{ fontSize: 13 }}>
                {formatMoney(i.amountDue ?? i.total)} due · <StatusBadge status={i.status || 'unpaid'} />
              </div>
            </div>
            <div className="list-card-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fillFromInvoice(i.id)}>Fill form</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => markFullyPaid(i)}>Mark paid</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindOpen(i, 'wa')}>Remind WA</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => remindOpen(i, 'email')}>Remind email</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => payfastCheckout(i)}>PayFast</button>
              <Link className="btn btn-outline btn-sm" to={`/invoices/${i.id}`}>Edit</Link>
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Payment history</h3>
        <SearchInput value={q} onChange={setQ} placeholder="Search method, ref, client…" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <FilterChips options={methodChips} value={methodFilter} onChange={setMethodFilter} />
      </div>

      {!filteredHistory.length ? (
        <EmptyState
          title={payments.length ? 'No matches' : 'No payments yet'}
          hint={payments.length ? 'Try another search or method filter.' : 'Record an EFT or use PayFast above.'}
        />
      ) : (
        filteredHistory.map((p) => {
          const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
          const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
          return (
            <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong>{formatMoney(p.amount)}</strong>
                <span className="muted" style={{ marginLeft: 8 }}>
                  {formatDateZA(p.date)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ''}
                </span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {[inv?.number, client?.name].filter(Boolean).join(' · ') || '—'}
                  {p.date ? ` · ${relativeTime(p.date)}` : ''}
                </div>
              </div>
              <div className="list-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendReceipt(p, 'wa')}>Receipt WA</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => sendReceipt(p, 'email')}>Receipt email</button>
                {inv ? <Link className="btn btn-outline btn-sm" to={`/invoices/${inv.id}`}>Invoice</Link> : null}
                {p.reference ? <CopyButton text={p.reference} label="Ref" /> : null}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => delPayment(p)}>Delete</button>
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
