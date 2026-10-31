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
import { recordPayment, deletePayment } from '../lib/payments'
import { parseBankCsv, normalizeBankRows, matchBankToInvoices, applyBankMatch } from '../lib/bankImport'
import PageInsightsBar from '../components/PageInsightsBar'

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
  const [bankMatches, setBankMatches] = useState(null)
  const [bankBusy, setBankBusy] = useState(false)

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
    try {
      await recordPayment({
        invoice: inv,
        amount: amt,
        method,
        date,
        reference,
        existingPayments: payments,
      })
      setAmount('')
      setReference('')
      await refresh()
      toast('Payment recorded · invoice & books updated', 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
  }

  const markFullyPaid = async (inv) => {
    const due = Number(inv.amountDue ?? inv.total) || 0
    if (due <= 0) return toast('Nothing due', 'info')
    try {
      await recordPayment({
        invoice: inv,
        amount: due,
        method: 'EFT',
        date: new Date().toISOString().slice(0, 10),
        reference: 'Full balance',
        existingPayments: payments,
      })
      await refresh()
      toast(`Marked ${inv.number} paid · books updated`, 'success')
    } catch (err) {
      toast(err.message || String(err), 'error')
    }
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
      message: 'Removes the payment, reverses the invoice balance, and voids the matching journal entry.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
        const related = payments.filter((x) => String(x.invoiceId) === String(p.invoiceId))
        await deletePayment(p, { invoice: inv, allPaymentsForInvoice: related })
        await refresh()
        toast('Payment deleted · invoice & books reversed', 'success')
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

  const copyPaymentSummary = async (p) => {
    const inv = invoices.find((i) => String(i.id) === String(p.invoiceId))
    const client = clients.find((c) => String(c.id) === String(p.clientId || inv?.clientId))
    const text = buildReceipt(p, inv, client, company).replace(/\*/g, '')
    try {
      await navigator.clipboard.writeText(text)
      toast('Receipt text copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const refillFromPayment = (p) => {
    setInvoiceId(String(p.invoiceId || ''))
    setAmount(String(Number(p.amount) || ''))
    setMethod(p.method || 'EFT')
    setReference(p.reference ? `Re: ${p.reference}` : '')
    setDate(new Date().toISOString().slice(0, 10))
    toast('Form filled from payment — adjust and record if needed', 'info')
  }

  const onBankFile = async (file) => {
    if (!file) return
    setBankBusy(true)
    try {
      const textCsv = await file.text()
      const parsed = parseBankCsv(textCsv)
      const txns = normalizeBankRows(parsed)
      const matches = matchBankToInvoices(txns, invoices, clients)
      setBankMatches(matches)
      toast(`${txns.length} bank lines · ${matches.filter((m) => m.suggested).length} suggested matches`, 'info')
    } catch (e) {
      toast(e?.message || 'Could not parse CSV', 'error')
    } finally {
      setBankBusy(false)
    }
  }

  const applySuggestedMatches = async () => {
    if (!bankMatches?.length) return
    setBankBusy(true)
    let n = 0
    try {
      for (const m of bankMatches) {
        if (!m.suggested || !m.invoice) continue
        try {
          await applyBankMatch({ txn: m.txn, invoice: m.invoice, existingPayments: payments })
          n++
        } catch (e) {
          console.warn(e)
        }
      }
      await refresh()
      setBankMatches(null)
      toast(`Applied ${n} bank match(es)`, 'success')
    } finally {
      setBankBusy(false)
    }
  }

  const markAllOpenPaid = () => {
    if (!open.length) return toast('No open invoices', 'info')
    setConfirm({
      title: `Mark ${open.length} invoices paid?`,
      message: 'Records full-balance EFT payments for every open invoice. This cannot be undone in bulk.',
      danger: true,
      confirmLabel: 'Mark all paid',
      action: async () => {
        let n = 0
        for (const inv of open) {
          const due = Number(inv.amountDue ?? inv.total) || 0
          if (due <= 0) continue
          try {
            await recordPayment({
              invoice: inv,
              amount: due,
              method: 'EFT',
              date: new Date().toISOString().slice(0, 10),
              reference: 'Bulk full balance',
              existingPayments: payments,
            })
            n += 1
          } catch (e) {
            console.warn(e)
          }
        }
        await refresh()
        toast(`Marked ${n} invoice(s) paid`, 'success')
        setConfirm(null)
      },
    })
  }

  const methodChips = [
    { id: 'all', label: 'All', count: methodCounts.all },
    ...['EFT', 'Bank transfer', 'Cash', 'Debit card', 'Credit card', 'Cheque', 'PayFast', 'Mobile payment', 'Other'].map((m) => ({
      id: m, label: m, count: methodCounts[m] || 0,
    })),
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="subtitle">Record · receipts · reminders · history · books</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filteredHistory.length}>Export CSV</button>
          <button type="button" className="btn btn-outline" onClick={markAllOpenPaid} disabled={!open.length}>Mark all open paid</button>
          <label className="btn btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
            {bankBusy ? 'Importing…' : 'Import bank CSV'}
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onBankFile(f) }} />
          </label>
          <Link className="btn btn-outline" to="/excel">Excel viewer</Link>
          <Link className="btn btn-secondary" to="/invoices">Invoices</Link>
          <Link className="btn btn-outline" to="/reports">Reports</Link>
          <Link className="btn btn-outline" to="/accounting">Accounting</Link>
          <Link className="btn btn-outline" to="/clients">Clients</Link>
        </div>
      </div>

      <PageInsightsBar page="payments" />

      {bankMatches && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #16a34a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Bank import matches</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" disabled={bankBusy || !bankMatches.some((m) => m.suggested)} onClick={applySuggestedMatches}>
                Apply suggested
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setBankMatches(null)}>Dismiss</button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>Credits matched by amount + invoice number / client name in description.</p>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Amount</th><th>Description</th><th>Match</th><th>Score</th></tr>
              </thead>
              <tbody>
                {bankMatches.filter((m) => m.txn.isCredit).slice(0, 40).map((m) => (
                  <tr key={m.txn.id} className={m.suggested ? '' : 'muted'}>
                    <td>{m.txn.date}</td>
                    <td>{formatMoney(m.txn.amount)}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.txn.description}</td>
                    <td>{m.invoice ? `${m.invoice.number} · ${m.client?.name || ''}` : '—'}</td>
                    <td>{m.score}{m.suggested ? ' ✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          <select className="select value={method} onChange={(e) => setMethod(e.target.value)}>
            {['EFT', 'Bank transfer', 'Cash', 'Debit card', 'Credit card', 'Cheque', 'PayFast', 'Mobile payment', 'Other'].map((m) => <option key={m}>{m}</option>)}
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
              <div>
                <strong>{formatMoney(p.amount)}</strong> · {p.method || '—'}
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDateZA(p.date)} · {inv?.number || '—'} · {client?.name || '—'}
                  {p.reference ? ` · ${p.reference}` : ''}
                  {' · '}{relativeTime(p.date || p.createdAt)}
                </div>
              </div>
              <div className="list-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendReceipt(p, 'wa')}>WA receipt</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => sendReceipt(p, 'email')}>Email</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => copyPaymentSummary(p)}>Copy</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => refillFromPayment(p)}>Refill</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => delPayment(p)}>Del</button>
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
