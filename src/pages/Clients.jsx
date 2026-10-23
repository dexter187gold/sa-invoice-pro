import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, downloadCsv, FilterChips,
  ActionMenu, SelectCell, DataTable, EditableCell, formatDateZA,
} from '../components/ui'
import { contactsPickerSupported, pickContactsFromPhone, normalizeSaPhone } from '../lib/contacts'
import { CLIENT_CATEGORIES, categoryLabel, categoryOf } from '../lib/clientCategories'
import { openWhatsApp, openEmail, buildClientStatement } from '../lib/share'
import { downloadStatementPdf, shareStatementPdf } from '../lib/statementPdf'
import { Sync } from '../lib/sync'

export default function Clients() {
  const { clients, invoices, payments, company, refresh, toast } = useApp()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod',
  })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [portalBusyId, setPortalBusyId] = useState(null)
  const [lastPortal, setLastPortal] = useState(null)
  const canPick = contactsPickerSupported()

  const catCounts = useMemo(() => {
    const c = { all: clients.length }
    for (const cat of CLIENT_CATEGORIES) c[cat.id] = 0
    for (const client of clients) {
      const id = categoryOf(client)
      if (c[id] != null) c[id]++
    }
    return c
  }, [clients])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (catFilter !== 'all' && categoryOf(c) !== catFilter) return false
      return matchesQuery(c, q, ['name', 'email', 'phone', 'company', 'vatNumber', 'address', 'category'])
    })
  }, [clients, q, catFilter])

  const arByClient = useMemo(() => {
    const map = {}
    for (const inv of invoices) {
      if (!['unpaid', 'partial', 'overdue'].includes(inv.status)) continue
      const id = String(inv.clientId)
      map[id] = (map[id] || 0) + (Number(inv.amountDue ?? inv.total) || 0)
    }
    return map
  }, [invoices])

  const totalAr = useMemo(() => Object.values(arByClient).reduce((s, v) => s + v, 0), [arByClient])

  const saveField = async (client, field, value) => {
    await db.put(STORES.clients, { ...client, [field]: value, updatedAt: new Date().toISOString() })
    await refresh()
  }

  const setCategory = async (client, category) => {
    await db.put(STORES.clients, { ...client, category, updatedAt: new Date().toISOString() })
    await refresh()
    toast(`Category → ${categoryLabel(category)}`, 'success')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    await db.add(STORES.clients, {
      ...form,
      name: form.name.trim(),
      category: form.category || 'cod',
      createdAt: new Date().toISOString(),
    })
    setForm({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod' })
    setShow(false)
    await refresh()
    toast('Client saved', 'success')
  }

  const importFromPhone = async () => {
    setBusy(true)
    try {
      const list = await pickContactsFromPhone({ multiple: true })
      if (!list.length) return toast('No contacts selected', 'info')
      let added = 0
      const existingPhones = new Set(clients.map((c) => String(c.phone || '').replace(/\D/g, '')).filter(Boolean))
      for (const c of list) {
        const name = (c.name || c.phone || 'Contact').trim()
        const phone = normalizeSaPhone(c.phone) || c.phone || ''
        const phoneKey = String(phone).replace(/\D/g, '')
        if (phoneKey && existingPhones.has(phoneKey)) continue
        await db.add(STORES.clients, {
          name, phone, email: c.email || '', company: '', category: 'walk_in',
          createdAt: new Date().toISOString(), source: 'phonebook',
        })
        if (phoneKey) existingPhones.add(phoneKey)
        added++
      }
      await refresh()
      toast(added ? `Imported ${added}` : 'Nothing new', added ? 'success' : 'info')
    } catch (e) {
      toast(e.message || 'Could not open contacts', 'error')
    } finally {
      setBusy(false)
    }
  }

  const del = (id) => {
    setConfirm({
      title: 'Delete client?',
      message: 'This cannot be undone.',
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

  const createPortal = async (client) => {
    if (!Sync.isLoggedIn()) return toast('Log in to Cloud under Settings first', 'error')
    setPortalBusyId(client.id)
    try {
      await Sync.pushAll({ company, clients, invoices })
      const data = await Sync.createPortalLink(client.id, { days: 90 })
      setLastPortal({ clientId: client.id, url: data.url, expires: data.expires, name: client.name })
      try {
        await navigator.clipboard.writeText(data.url)
        toast('Portal link created & copied', 'success')
      } catch {
        toast('Portal link created', 'success')
      }
    } catch (e) {
      toast(e.message || 'Portal failed — sync cloud data first', 'error')
    } finally {
      setPortalBusyId(null)
    }
  }

  const statementText = (client) => buildClientStatement(client, invoices, company, payments)

  const rowActions = (c) => [
    { id: 'portal', label: portalBusyId === c.id ? 'Portal…' : 'Client portal', onClick: () => createPortal(c) },
    {
      id: 'wa-st',
      label: 'WA statement',
      onClick: () => {
        const ok = openWhatsApp(c.phone, statementText(c))
        toast(ok ? 'Opening WhatsApp…' : 'No phone on client', ok ? 'success' : 'info')
      },
    },
    {
      id: 'email-st',
      label: 'Email statement',
      onClick: () => {
        const ok = openEmail(c.email, `Account statement — ${company?.name || 'SA Invoice Pro'}`, statementText(c).replace(/\*/g, ''))
        toast(ok ? 'Opening email…' : 'No email on client', ok ? 'success' : 'info')
      },
    },
    {
      id: 'pdf',
      label: 'Statement PDF',
      onClick: () => {
        try {
          downloadStatementPdf(c, invoices, company, payments)
          toast('PDF downloaded', 'success')
        } catch (e) {
          toast(e.message || 'PDF failed', 'error')
        }
      },
    },
    {
      id: 'share-pdf',
      label: 'Share PDF (WA)',
      onClick: async () => {
        try {
          const r = await shareStatementPdf(c, invoices, company, {
            channel: 'wa',
            text: statementText(c),
            payments,
          })
          if (r.method === 'download-fallback') toast('PDF downloaded — attach in WhatsApp', 'info')
          else if (r.shared) toast('Shared', 'success')
        } catch (e) {
          toast(e.message || 'Share failed', 'error')
        }
      },
    },
    {
      id: 'wa',
      label: 'WhatsApp',
      onClick: () => {
        const ok = openWhatsApp(c.phone, `Hi ${c.name || ''},`)
        toast(ok ? 'Opening WhatsApp…' : 'No phone', ok ? 'success' : 'info')
      },
    },
    { id: 'del', label: 'Delete', danger: true, onClick: () => del(c.id) },
  ]

  const chips = [
    { id: 'all', label: 'All', count: catCounts.all },
    ...CLIENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: catCounts[cat.id] || 0 })),
  ]

  const catOptions = CLIENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label }))

  const exportCsv = () => {
    downloadCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Category', 'Email', 'Phone', 'Company', 'Outstanding AR'],
      filtered.map((c) => [
        c.name || '',
        categoryLabel(categoryOf(c)),
        c.email || '',
        c.phone || '',
        c.company || '',
        arByClient[String(c.id)] || 0,
      ])
    )
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
            {' · editable table · portal · PDF'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {canPick && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={importFromPhone}>
              {busy ? 'Opening…' : '📱 From phone book'}
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>
            {show ? 'Close' : 'Add client'}
          </button>
        </div>
      </div>

      {show && (
        <form className="card form-grid cols-3" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <label className="label">VAT number</label>
            <input className="input" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CLIENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" type="submit">Save client</button>
          </div>
        </form>
      )}

      <div className="toolbar sticky-tools">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email…" />
        <FilterChips options={chips} value={catFilter} onChange={setCatFilter} />
      </div>

      {!filtered.length ? (
        <EmptyState
          title={clients.length ? 'No matches' : 'No clients yet'}
          hint={clients.length ? 'Try another search or category.' : 'Add a client or import from your phone book.'}
          action={!clients.length ? <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Add client</button> : null}
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <DataTable sticky>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>AR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const ar = arByClient[String(c.id)] || 0
                return (
                  <tr key={c.id}>
                    <td>
                      <EditableCell value={c.name || ''} onSave={(v) => saveField(c, 'name', v)} placeholder="Name" />
                    </td>
                    <td>
                      <SelectCell
                        value={categoryOf(c)}
                        options={catOptions}
                        onChange={(v) => setCategory(c, v)}
                      />
                    </td>
                    <td>
                      <EditableCell value={c.email || ''} onSave={(v) => saveField(c, 'email', v)} placeholder="email" />
                    </td>
                    <td>
                      <EditableCell value={c.phone || ''} onSave={(v) => saveField(c, 'phone', v)} placeholder="phone" />
                    </td>
                    <td>
                      <EditableCell value={c.company || ''} onSave={(v) => saveField(c, 'company', v)} placeholder="—" />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: ar > 0 ? 600 : 400 }}>
                      {ar > 0 ? formatMoney(ar) : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <ActionMenu label="⋯" items={rowActions(c)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </div>
      )}

      {lastPortal?.url && (
        <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid var(--green, #16a34a)' }}>
          <strong>Last portal link</strong> · {lastPortal.name}
          <div style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>
            <a href={lastPortal.url} target="_blank" rel="noopener noreferrer">{lastPortal.url}</a>
          </div>
          {lastPortal.expires && (
            <div className="muted" style={{ fontSize: 12 }}>Expires {formatDateZA(lastPortal.expires)}</div>
          )}
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
