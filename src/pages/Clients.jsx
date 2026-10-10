import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, CopyButton, downloadCsv,
} from '../components/ui'

export default function Clients() {
  const { clients, invoices, refresh, toast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '' })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

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

  const invCountByClient = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      const id = String(inv.clientId)
      map[id] = (map[id] || 0) + 1
    }
    return map
  }, [invoices])

  const totalAr = useMemo(() => Object.values(arByClient).reduce((s, v) => s + v, 0), [arByClient])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return toast('Invalid email address', 'error')
    }
    await db.add(STORES.clients, { ...form, name: form.name.trim(), createdAt: new Date().toISOString() })
    setForm({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '' })
    setShow(false)
    await refresh()
    toast('Client saved', 'success')
  }

  const del = (id) => {
    const linked = invoices.some((i) => String(i.clientId) === String(id))
    setConfirm({
      title: 'Delete client?',
      message: linked
        ? 'This client has invoices. The client record will be removed; invoices remain.'
        : 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.clients, id)
        await refresh()
        toast('Deleted', 'success')
        setConfirm(null)
      },
    })
  }

  const exportStatement = (client) => {
    const rows = invoices
      .filter((i) => String(i.clientId) === String(client.id))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    downloadCsv(
      `statement-${(client.name || 'client').replace(/\s+/g, '-').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Number', 'Date', 'Due date', 'Status', 'Total', 'Amount due', 'Notes'],
      rows.map((i) => [
        i.number || '', i.date || '', i.dueDate || '', i.status || '',
        Number(i.total) || 0, Number(i.amountDue ?? i.total) || 0, i.notes || '',
      ])
    )
    toast('Client statement exported', 'success')
  }

  const exportCsv = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'VAT', 'Address', 'Outstanding AR', 'Invoices']
    const rows = filtered.map((c) => [
      c.name || '',
      c.company || '',
      c.email || '',
      c.phone || '',
      c.vatNumber || '',
      c.address || '',
      arByClient[String(c.id)] || 0,
      invCountByClient[String(c.id)] || 0,
    ])
    downloadCsv(`clients-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">
            {filtered.length} shown · {clients.length} total
            {totalAr > 0 ? ` · AR ${formatMoney(totalAr)}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>
            {show ? 'Close' : 'Add client'}
          </button>
        </div>
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, VAT…" />
        <Link className="btn btn-outline btn-sm" to="/invoices/new">Invoice client</Link>
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
            <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} placeholder="4xxxxxxxxx" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Save client</button>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState
          title={clients.length ? 'No matches' : 'No clients yet'}
          hint={clients.length ? 'Clear search to see everyone.' : 'Add your first customer — required before invoices, quotes, and job cards.'}
          action={!clients.length ? <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Add client</button> : null}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => {
            const arA = arByClient[String(a.id)] || 0
            const arB = arByClient[String(b.id)] || 0
            if (arB !== arA) return arB - arA
            return String(a.name || '').localeCompare(String(b.name || ''))
          })
          .map((c) => {
            const ar = arByClient[String(c.id)] || 0
            const invN = invCountByClient[String(c.id)] || 0
            return (
              <div key={c.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{c.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {[c.company, c.email, c.phone, c.vatNumber && `VAT ${c.vatNumber}`].filter(Boolean).join(' · ')}
                  </div>
                  {c.address ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.address}</div> : null}
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {invN} invoice{invN === 1 ? '' : 's'}
                    {ar > 0 && (
                      <> · Outstanding <strong style={{ color: 'var(--warn)' }}>{formatMoney(ar)}</strong></>
                    )}
                  </div>
                </div>
                <div className="list-card-actions">
                  {c.email ? <CopyButton text={c.email} label="Email" /> : null}
                  {c.phone ? <CopyButton text={c.phone} label="Phone" /> : null}
                  <Link className="btn btn-secondary btn-sm" to="/invoices/new">Invoice</Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(c.id)}>Delete</button>
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
