
import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import * as db from '../lib/db'
import { STORES } from '../lib/db'

export default function Invoices() {
  const { invoices, clients, refresh, toast } = useApp()
  const list = [...invoices].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  const del = async (id) => {
    if (!confirm('Delete invoice?')) return
    await db.remove(STORES.invoices, id)
    await refresh()
    toast('Deleted', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p className="subtitle">{list.length} document(s)</p>
        </div>
        <Link className="btn btn-primary" to="/invoices/new">New invoice</Link>
      </div>
      {!list.length ? (
        <div className="card empty">No invoices yet.</div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => {
                const c = clients.find((x) => String(x.id) === String(inv.clientId))
                return (
                  <tr key={inv.id}>
                    <td>{inv.number || inv.id?.slice(0, 8)}</td>
                    <td>{c?.name || '—'}</td>
                    <td>{(inv.date || '').slice(0, 10)}</td>
                    <td><span className={`badge ${inv.status === 'paid' ? '' : inv.status === 'overdue' ? 'bad' : 'warn'}`}>{inv.status || 'unpaid'}</span></td>
                    <td>{formatMoney(inv.total)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-outline btn-sm" to={`/invoices/${inv.id}`}>Edit</Link>{' '}
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => del(inv.id)}>Del</button>
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
