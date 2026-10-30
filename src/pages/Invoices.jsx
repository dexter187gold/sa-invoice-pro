import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import * as db from '../lib/db'
import { deleteWithUndo, undoLast, peekUndo } from '../lib/undo'
import { STORES } from '../lib/db'
import {
  SearchInput, FilterChips, StatusBadge, EmptyState, formatDateZA, matchesQuery,
  SortableTh, useSort, ConfirmDialog, relativeTime, daysOverdue, downloadCsv, PageFade,
} from '../components/ui'
import { buildOverdueReminder, toWaNumber, openWhatsApp } from '../lib/share'
import ActionDock from '../components/ActionDock'
import { bulkSetInvoiceStatus, bulkExportCsv, invoiceCsvColumns } from '../lib/bulkOps'
import { invoiceLabel } from '../lib/statusLabels'
import { duplicateInvoice } from '../lib/documentActions'
import { createCreditNote } from '../lib/insights'
import { runDueRecurring, listRecurring, upsertRecurring } from '../lib/recurring'
import { buildChaseList } from '../lib/chasePack'
import {
  setPromiseToPay,
  clearPromiseToPay,
  logCollectionCall,
  listCallLog,
  invoicesDueForChase,
} from '../lib/collections'
import PageInsightsBar from '../components/PageInsightsBar'

export default function Invoices() {
  const { invoices, clients, company, refresh, toast } = useApp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState({})
  const [confirm, setConfirm] = useState(null)
  const { sort, onSort, apply } = useSort('date', 'desc')

  const counts = useMemo(() => {
    const c = { all: invoices.length, unpaid: 0, partial: 0, paid: 0, overdue: 0, cancelled: 0 }
    for (const i of invoices) {
      const s = i.status || 'unpaid'
      if (c[s] != null) c[s]++
    }
    return c
  }, [invoices])

  const list = useMemo(() => {
    let rows = [...invoices]
    if (status !== 'all') rows = rows.filter((i) => (i.status || 'unpaid') === status)
    rows = rows.filter((inv) => {
      const c = clients.find((x) => String(x.id) === String(inv.clientId))
      return matchesQuery(
        { ...inv, clientName: c?.name || '' },
        q,
        ['number', 'status', 'clientName', 'notes', 'promiseNote']
      )
    })
    return apply(rows, {
      date: (r) => r.date || r.createdAt || '',
      total: (r) => Number(r.total) || 0,
      due: (r) => Number(r.amountDue ?? r.total) || 0,
      client: (r) => {
        const c = clients.find((x) => String(x.id) === String(r.clientId))
        return c?.name || ''
      },
      number: (r) => r.number || '',
      status: (r) => r.status || 'unpaid',
    })
  }, [invoices, clients, q, status, apply])

  const selectedIds = Object.keys(selected).filter((id) => selected[id])
  const allVisibleSelected = list.length > 0 && list.every((i) => selected[i.id])

  const toggleAll = () => {
    if (allVisibleSelected) {
      const next = { ...selected }
      for (const i of list) delete next[i.id]
      setSelected(next)
    } else {
      const next = { ...selected }
      for (const i of list) next[i.id] = true
      setSelected(next)
    }
  }

  const clientOf = (inv) => clients.find((x) => String(x.id) === String(inv.clientId))

  const remindWhatsApp = (inv) => {
    const c = clientOf(inv)
    const phone = c?.phone || ''
    const wa = toWaNumber(phone)
    const msg = buildOverdueReminder(inv, c, company)
    const url = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast(wa ? 'Opening WhatsApp reminder…' : 'No phone on client — WhatsApp opened without number', wa ? 'success' : 'info')
  }

  const remindEmail = (inv) => {
    const c = clientOf(inv)
    const to = c?.email || ''
    const subject = `Payment reminder: invoice ${inv.number || ''} — ${company?.name || 'SA Invoice Pro'}`
    const body = buildOverdueReminder(inv, c, company).replace(/\*/g, '')
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    toast(to ? 'Opening email reminder…' : 'No email on client — mail app opened without recipient', to ? 'success' : 'info')
  }

  const remindSelected = (channel) => {
    const open = selectedIds
      .map((id) => invoices.find((i) => String(i.id) === String(id)))
      .filter((inv) => inv && ['unpaid', 'partial', 'overdue'].includes(inv.status || 'unpaid'))
    if (!open.length) return toast('Select unpaid / partial / overdue invoices', 'error')
    const inv = open[0]
    if (channel === 'wa') remindWhatsApp(inv)
    else remindEmail(inv)
    if (open.length > 1) {
      toast(`${open.length} selected — opened first. Tap Remind on each row for the rest.`, 'info')
    }
  }

  const promisePay = async (inv) => {
    const note = window.prompt('Promise-to-pay note (what they said)?', inv.promiseNote || 'Will pay by EFT')
    if (note == null) return
    const days = window.prompt('Follow up in how many days?', '3')
    if (days == null) return
    try {
      await setPromiseToPay(inv, { note, days: Number(days) || 3 })
      await refresh()
      toast('Promise-to-pay saved + next chase date set', 'success')
    } catch (e) {
      toast(e?.message || 'Failed', 'error')
    }
  }

  const logCall = async (inv) => {
    const outcome = window.prompt(
      'Call outcome? (no_answer / promised / disputed / paid / callback)',
      'promised',
    )
    if (outcome == null) return
    const note = window.prompt('Short note?', '') || ''
    try {
      await logCollectionCall({
        invoiceId: inv.id,
        clientId: inv.clientId,
        outcome: String(outcome).trim() || 'note',
        note,
        who: company?.name || 'desk',
      })
      if (String(outcome).toLowerCase().includes('promis')) {
        await setPromiseToPay(inv, { note: note || 'Promised on call', days: 3 })
      }
      await refresh()
      toast('Call logged', 'success')
    } catch (e) {
      toast(e?.message || 'Log failed', 'error')
    }
  }

  const delOne = (id) => {
    setConfirm({
      title: 'Delete invoice?',
      message: 'You can Undo within 30 seconds after deleting.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        const row = invoices.find((i) => String(i.id) === String(id))
        if (row) await deleteWithUndo({ store: STORES.invoices, rows: [row], toast, label: 'Invoice deleted' })
        else await db.remove(STORES.invoices, id)
        await refresh()
        setConfirm(null)
      },
    })
  }

  const delBulk = () => {
    if (!selectedIds.length) return
    setConfirm({
      title: `Delete ${selectedIds.length} invoice(s)?`,
      message: 'Selected invoices will be permanently removed. Undo available 30s.',
      danger: true,
      confirmLabel: 'Delete all',
      action: async () => {
        const rows = selectedIds.map((id) => invoices.find((i) => String(i.id) === String(id))).filter(Boolean)
        if (rows.length) await deleteWithUndo({ store: STORES.invoices, rows, toast, label: 'Invoices deleted' })
        else {
          for (const id of selectedIds) await db.remove(STORES.invoices, id)
        }
        setSelected({})
        await refresh()
        setConfirm(null)
      },
    })
  }

  const duplicate = async (inv) => {
    try {
      const copy = await duplicateInvoice(inv, { invoices })
      await refresh()
      toast(`Duplicated as ${copy.number}`, 'success')
    } catch (e) {
      toast(e?.message || 'Duplicate failed', 'error')
    }
  }

  const creditNote = async (inv) => {
    try {
      const cn = await createCreditNote(inv, { invoices, reason: `Credit against ${inv.number || inv.id}` })
      await refresh()
      toast(`Credit note ${cn.number} created`, 'success')
    } catch (e) {
      toast(e?.message || 'Credit note failed', 'error')
    }
  }

  const generateRecurring = async () => {
    try {
      const r = await runDueRecurring({ invoices, vatRate: 0.15, vatEnabled: true })
      await refresh()
      toast(r.created ? `Generated ${r.created} recurring invoice(s)` : 'No recurring invoices due', r.created ? 'success' : 'info')
    } catch (e) {
      toast(e?.message || 'Recurring failed', 'error')
    }
  }

  const addMonthlyRetainer = async () => {
    const clientId = invoices[0]?.clientId || clients[0]?.id
    if (!clientId) return toast('Add a client first', 'error')
    const amount = window.prompt('Monthly retainer amount (R)?', '1500')
    if (amount == null) return
    await upsertRecurring({
      clientId,
      cadence: 'monthly',
      dayOfMonth: 1,
      lines: [{ description: 'Monthly retainer', qty: 1, price: Number(amount) || 0 }],
      notes: 'Auto-generated recurring',
    })
    toast('Recurring monthly template saved — use Generate recurring when due', 'success')
  }

  const batchOverdueWa = () => {
    const ranked = buildChaseList(invoices, clients, company).filter((r) => r.days > 0 || r.inv.status === 'overdue')
    const listRows = ranked.length ? ranked : buildChaseList(invoices, clients, company)
    if (!listRows.length) return toast('No open invoices to chase', 'info')
    let opened = 0
    for (const row of listRows.slice(0, 5)) {
      if (row.phone) {
        try { openWhatsApp(row.phone, row.message); opened++ } catch {}
      }
    }
    const summary = listRows.map((r) =>
      `${r.inv.number || r.inv.id} · ${r.client.name || ''} · ${r.days}d · ${r.phone || 'no phone'}`
    ).join('\n')
    try { navigator.clipboard.writeText(summary) } catch {}
    toast(
      opened
        ? `Chase pack: ${opened} WhatsApp · ${listRows.length} on clipboard (worst first)`
        : `Chase list copied (${listRows.length}) — add phones on clients`,
      opened ? 'success' : 'info',
    )
  }

  const chaseDuePromises = async () => {
    const due = invoicesDueForChase(invoices)
    if (!due.length) return toast('No promise-to-pay chases due today', 'info')
    let n = 0
    for (const inv of due.slice(0, 5)) {
      const c = clientOf(inv)
      if (c?.phone) {
        try {
          openWhatsApp(c.phone, buildOverdueReminder(inv, c, company))
          n++
        } catch {}
      }
    }
    toast(n ? `Opened ${n} promise-chase WhatsApp(s)` : `${due.length} due — add client phones`, n ? 'success' : 'info')
  }

  const flagOverdue = async () => {
    let n = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (const inv of invoices) {
      if (!['unpaid', 'partial'].includes(inv.status || 'unpaid')) continue
      const dueStr = inv.dueDate || inv.date
      if (!dueStr) continue
      const due = new Date(dueStr)
      due.setHours(0, 0, 0, 0)
      if (due < today) {
        await db.put(STORES.invoices, { ...inv, status: 'overdue' })
        n++
      }
    }
    await refresh()
    toast(n ? `Flagged ${n} invoice(s) overdue` : 'No unpaid invoices past due date', n ? 'success' : 'info')
  }

  const markPaidBulk = () => {
    if (!selectedIds.length) return
    setConfirm({
      title: `Mark ${selectedIds.length} as paid?`,
      message: 'Selected invoices will be set to paid and amount due to zero.',
      confirmLabel: 'Mark paid',
      action: async () => {
        for (const id of selectedIds) {
          const inv = invoices.find((i) => String(i.id) === String(id))
          if (!inv) continue
          await db.put(STORES.invoices, {
            ...inv,
            status: 'paid',
            amountDue: 0,
            paidAt: new Date().toISOString(),
          })
        }
        setSelected({})
        await refresh()
        toast(`Marked ${selectedIds.length} paid`, 'success')
        setConfirm(null)
      },
    })
  }

  const exportCsv = () => {
    const headers = ['Number', 'Client', 'Date', 'Due date', 'Status', 'Total', 'Amount due', 'Promise', 'Next chase', 'Notes']
    const rows = list.map((inv) => {
      const c = clients.find((x) => String(x.id) === String(inv.clientId))
      return [
        inv.number || '',
        c?.name || '',
        inv.date || '',
        inv.dueDate || '',
        inv.status || 'unpaid',
        Number(inv.total) || 0,
        Number(inv.amountDue ?? inv.total) || 0,
        inv.promiseNote || '',
        inv.nextChaseDate || '',
        inv.notes || '',
      ]
    })
    downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unpaid', label: 'Unpaid', count: counts.unpaid },
    { id: 'partial', label: 'Partial', count: counts.partial },
    { id: 'paid', label: 'Paid', count: counts.paid },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p className="subtitle">
            {list.length} shown{q || status !== 'all' ? ` · filtered from ${invoices.length}` : ` · ${invoices.length} total`}
            {counts.overdue ? ` · ${counts.overdue} overdue` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!list.length}>
            Export CSV
          </button>
          <button type="button" className="btn btn-outline" onClick={flagOverdue} title="Set unpaid past due date to overdue">
            Flag overdue
          </button>
          <button type="button" className="btn btn-secondary" onClick={batchOverdueWa} title="Ranked chase pack — worst first">
            Chase pack (ranked)
          </button>
          <button type="button" className="btn btn-outline" onClick={chaseDuePromises} title="WhatsApp invoices whose promise chase date is due">
            Chase promises due
          </button>
          <button type="button" className="btn btn-outline" onClick={generateRecurring} title="Spawn draft invoices from due recurring templates">
            Generate recurring
          </button>
          <button type="button" className="btn btn-outline" onClick={addMonthlyRetainer} title="Quick-add monthly retainer template">
            + Retainer
          </button>
          <button type="button" className="btn btn-outline" onClick={async () => {
            const r = await undoLast()
            if (r.ok) { await refresh(); toast(`Restored ${r.restored}`, 'success') }
            else toast('Nothing to undo', 'info')
          }} title="Restore last deleted invoices (30s)">
            Undo delete
          </button>
          <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
        </div>
      </div>

      <PageInsightsBar page="invoices" />

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search number, client, notes…" />
        <FilterChips options={chips} value={status} onChange={setStatus} />
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-bar">
          <strong>{selectedIds.length} selected</strong>
          <button type="button" className="btn btn-primary btn-sm" onClick={markPaidBulk}>Mark paid</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindSelected('wa')}>Remind WA</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindSelected('email')}>Remind email</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={delBulk}>Delete selected</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected({})}>Clear</button>
        </div>
      )}

      {!list.length ? (
        <EmptyState
          title={invoices.length ? 'No matches' : 'No invoices yet'}
          hint={invoices.length ? 'Try another search or filter.' : 'Create your first tax invoice — clients get paid faster with clear PDFs and WhatsApp share.'}
          action={!invoices.length ? <Link className="btn btn-primary" to="/invoices/new">New invoice</Link> : null}
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all visible" />
                </th>
                <SortableTh id="number" label="Number" sort={sort} onSort={onSort} />
                <SortableTh id="client" label="Client" sort={sort} onSort={onSort} />
                <SortableTh id="date" label="Date" sort={sort} onSort={onSort} />
                <SortableTh id="status" label="Status" sort={sort} onSort={onSort} />
                <SortableTh id="total" label="Total" sort={sort} onSort={onSort} />
                <SortableTh id="due" label="Due" sort={sort} onSort={onSort} />
                <th>Aging</th>
                <th>Promise</th>
                <th>Remind</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => {
                const c = clients.find((x) => String(x.id) === String(inv.clientId))
                const due = Number(inv.amountDue ?? inv.total) || 0
                const age = daysOverdue(inv.dueDate || inv.date)
                const isOpen = ['unpaid', 'partial', 'overdue'].includes(inv.status || 'unpaid')
                return (
                  <tr key={inv.id} className={inv.status === 'overdue' ? 'row-overdue' : ''}>
                    <td>
                      <input type="checkbox" checked={!!selected[inv.id]} onChange={(e) => setSelected({ ...selected, [inv.id]: e.target.checked })} aria-label={`Select ${inv.number}`} />
                    </td>
                    <td><Link to={`/invoices/${inv.id}`}>{inv.number || inv.id?.slice(0, 8)}</Link></td>
                    <td>{c?.name || '—'}</td>
                    <td title={relativeTime(inv.date)}>{formatDateZA(inv.date)}</td>
                    <td><StatusBadge status={inv.status || 'unpaid'} /></td>
                    <td>{formatMoney(inv.total)}</td>
                    <td>{formatMoney(due)}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {isOpen && age != null ? (
                        age > 0 ? <span className="text-danger">{age}d overdue</span> :
                        age === 0 ? 'Due today' : `In ${-age}d`
                      ) : '—'}
                    </td>
                    <td style={{ maxWidth: 120, fontSize: 12 }} className="muted">
                      {inv.promiseNote ? (
                        <span title={`Next chase: ${inv.nextChaseDate || '—'}`}>
                          {String(inv.promiseNote).slice(0, 28)}
                          {inv.nextChaseDate ? ` · ${String(inv.nextChaseDate).slice(5)}` : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {isOpen ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => remindWhatsApp(inv)}>WA</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => remindEmail(inv)}>Email</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => promisePay(inv)}>Promise</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => logCall(inv)}>Call</button>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Link className="btn btn-outline btn-sm" to={`/invoices/${inv.id}`}>Open</Link>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => duplicate(inv)}>Dup</button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => creditNote(inv)}>CN</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => delOne(inv.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
