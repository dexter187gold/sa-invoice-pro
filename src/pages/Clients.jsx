
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { SearchInput, EmptyState, matchesQuery } from '../components/ui'

export default function Clients() {
  const { clients, invoices, refresh, toast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '' })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(
    () => clients.filter((c) => matchesQuery(c, q, ['name', 'email', 'phone', 'company', 'vatNumber', 'address'])),
    [clients, q]
  )

  const arByClient = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      if (!['unpaid', 'partial', 'overdue'].includes(inv.status)) continue
      const id = String(inv.clientId)
      map[id] = (map[id] || 0) + (Number(inv.amountDue ?? inv.total) || 0)
    }
    return map
  }, [invoices])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return toast('Invalid email address', 'error')
    }
    await db.add(STORES.clients, { ...form, name: form.name.trim() })
    setForm({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '' })
    setShow(false)
    await refresh()
    toast('Client saved', 'success')
  }

  const del = async (id) => {
    const linked = invoices.some((i) => String(i.clientId) === String(id))
    if (linked && !confirm('This client has invoices. Delete client record anyway?')) return
    if (!linked && !confirm('Delete client?')) return
    await db.remove(STORES.clients, id)
    await refresh()
    toast('Deleted', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">
            {filtered.length} shown · {clients.length} total
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>
          {show ? 'Close' : 'Add client'}
        </button>
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, VAT…" />
        <Link className="btn btn-outline btn-sm" to="/invoices/new">
          Invoice client
        </Link>
      </div>

      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Name *</label>
            <input className="input focus-ring" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27…" />
          </div>
          <div>
            <label className="label">VAT number</label>
            <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">
            Save client
          </button>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState
          title={clients.length ? 'No matches' : 'No clients yet'}
          hint={clients.length ? 'Clear search to see everyone.' : 'Add your first customer to start invoicing.'}
          action={!clients.length ? <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Add client</button> : null}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((c) => {
            const ar = arByClient[String(c.id)] || 0
            return (
              <div key={c.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {[c.company, c.email, c.phone, c.vatNumber && `VAT ${c.vatNumber}`].filter(Boolean).join(' · ')}
                  </div>
                  {ar > 0 && (
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Outstanding <strong>{formatMoney(ar)}</strong>
                    </div>
                  )}
                </div>
                <div className="list-card-actions">
                  <Link className="btn btn-secondary btn-sm" to={`/invoices/new`}>
                    Invoice
                  </Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(c.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })
      )}
    </div>
  )
}
