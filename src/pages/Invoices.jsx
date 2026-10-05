import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import {
  SearchInput, FilterChips, StatusBadge, EmptyState, formatDateZA, matchesQuery,
  SortableTh, useSort, ConfirmDialog, relativeTime,
} from '../components/ui'

export default function Invoices() {
  const { invoices, clients, refresh, toast } = useApp()
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
        ['number', 'status', 'clientName', 'notes']
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

  const delOne = (id) => {
    setConfirm({
      title: 'Delete invoice?',
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.invoices, id)
        await refresh()
        toast('Deleted', 'success')
        setConfirm(null)
      },
    })
  }

  const delBulk = () => {
    if (!selectedIds.length) return
    setConfirm({
      title: `Delete ${selectedIds.length} invoice(s)?`,
      message: 'Selected invoices will be permanently removed.',
      danger: true,
      confirmLabel: 'Delete all',
      action: async () => {
        for (const id of selectedIds) await db.remove(STORES.invoices, id)
        setSelected({})
        await refresh()
        toast(`Deleted ${selectedIds.length}`, 'success')
        setConfirm(null)
      },
    })
  }

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'unpaid', label: 'Unpaid', count: counts.unpaid },
    { id: 'partial', label: 'Partial', count: counts.partial },
    { id: 'paid', label: 'Paid', count: counts.paid },
    { id: 'overdue', label: 'Overdue', count: counts.overdue },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p className="subtitle">
            {list.length} shown{q || status !== 'all' ? ` · filtered from ${invoices.length}` : ` · ${invoices.length} total`}
          </p>
        </div>
        <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search number, client, notes…" />
        <FilterChips options={chips} value={status} onChange={setStatus} />
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-bar">
          <strong>{selectedIds.length} selected</strong>
          <button type="button" className="btn btn-danger btn-sm" onClick={delBulk}>Delete selected</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected({})}>Clear</button>
        </div>
      )}

      {!list.length ? (
        <EmptyState
          title={invoices.length ? 'No matches' : 'No invoices yet'}
          hint={invoices.length ? 'Try another search or filter.' : 'Create your first tax invoice for a client.'}
          action={!invoices.length ? <Link className="btn btn-primary" to="/invoices/new">New invoice</Link> : null}
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible"
                  />
                </th>
                <SortableTh id="number" label="Number" sort={sort} onSort={onSort} />
                <SortableTh id="client" label="Client" sort={sort} onSort={onSort} />
                <SortableTh id="date" label="Date" sort={sort} onSort={onSort} />
                <SortableTh id="status" label="Status" sort={sort} onSort={onSort} />
                <SortableTh id="total" label="Total" sort={sort} onSort={onSort} />
                <SortableTh id="due" label="Due" sort={sort} onSort={onSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => {
                const c = clients.find((x) => String(x.id) === String(inv.clientId))
                const due = Number(inv.amountDue ?? inv.total) || 0
                return (
                  <tr key={inv.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[inv.id]}
                        onChange={(e) => setSelected({ ...selected, [inv.id]: e.target.checked })}
                        aria-label={`Select ${inv.number}`}
                      />
                    </td>
                    <td>
                      <Link to={`/invoices/${inv.id}`}>{inv.number || inv.id?.slice(0, 8)}</Link>
                    </td>
                    <td>{c?.name || '—'}</td>
                    <td title={relativeTime(inv.date)}>
                      {formatDateZA(inv.date)}
                    </td>
                    <td>
                      <StatusBadge status={inv.status || 'unpaid'} />
                    </td>
                    <td>{formatMoney(inv.total)}</td>
                    <td>{formatMoney(due)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-outline btn-sm" to={`/invoices/${inv.id}`}>
                        Edit
                      </Link>{' '}
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => delOne(inv.id)}>
                        Del
                      </button>
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
    </div>
  )
}
