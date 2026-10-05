
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { SearchInput, FilterChips, StatusBadge, EmptyState, formatDateZA, matchesQuery } from '../components/ui'

export default function Invoices() {
  const { invoices, clients, refresh, toast } = useApp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

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
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    return rows
  }, [invoices, clients, q, status])

  const del = async (id) => {
    if (!confirm('Delete invoice?')) return
    await db.remove(STORES.invoices, id)
    await refresh()
    toast('Deleted', 'success')
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
                <th>Number</th>
                <th>Client</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Due</th>
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
                      <Link to={`/invoices/${inv.id}`}>{inv.number || inv.id?.slice(0, 8)}</Link>
                    </td>
                    <td>{c?.name || '—'}</td>
                    <td>{formatDateZA(inv.date)}</td>
                    <td>
                      <StatusBadge status={inv.status || 'unpaid'} />
                    </td>
                    <td>{formatMoney(inv.total)}</td>
                    <td>{formatMoney(due)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-outline btn-sm" to={`/invoices/${inv.id}`}>
                        Edit
                      </Link>{' '}
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => del(inv.id)}>
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
    </div>
  )
}
