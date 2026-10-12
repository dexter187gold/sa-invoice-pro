import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, CopyButton, downloadCsv, FilterChips,
} from '../components/ui'
import { contactsPickerSupported, pickContactsFromPhone, normalizeSaPhone } from '../lib/contacts'
import { CLIENT_CATEGORIES, categoryLabel, categoryOf } from '../lib/clientCategories'
import { slaUsage } from '../lib/sla'

export default function Clients() {
  const { clients, invoices, tickets, timeEntries, refresh, toast } = useApp()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod', slaHoursCap: '',
  })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const canPick = contactsPickerSupported()

  const catCounts = useMemo(() => {
    const c = { all: clients.length }
    for (const cat of CLIENT_CATEGORIES) c[cat.id] = 0
    for (const client of clients) {
      const id = categoryOf(client)
      if (c[id] != null) c[id]++
      else c.other = (c.other || 0) + 1
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
    const cap = form.slaHoursCap === '' || form.slaHoursCap == null ? null : Number(form.slaHoursCap)
    await db.add(STORES.clients, {
      ...form,
      name: form.name.trim(),
      category: form.category || 'cod',
      slaHoursCap: Number.isFinite(cap) && cap > 0 ? cap : null,
      createdAt: new Date().toISOString(),
    })
    setForm({ name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod', slaHoursCap: '' })
    setShow(false)
    await refresh()
    toast('Client saved', 'success')
  }

  const setCategory = async (client, category) => {
    await db.put(STORES.clients, { ...client, category, updatedAt: new Date().toISOString() })
    await refresh()
    toast(`Category → ${categoryLabel(category)}`, 'success')
  }

  const setSlaCap = async (client, value) => {
    const cap = value === '' || value == null ? null : Number(value)
    await db.put(STORES.clients, {
      ...client,
      slaHoursCap: Number.isFinite(cap) && cap > 0 ? cap : null,
      updatedAt: new Date().toISOString(),
    })
    await refresh()
    toast(cap > 0 ? `SLA cap ${cap}h` : 'SLA cap cleared', 'success')
  }

  const importFromPhone = async () => {
    setBusy(true)
    try {
      const list = await pickContactsFromPhone({ multiple: true })
      if (!list.length) {
        toast('No contacts selected', 'info')
        return
      }
      let added = 0
      let skipped = 0
      const existingPhones = new Set(
        clients.map((c) => String(c.phone || '').replace(/\D/g, '')).filter(Boolean)
      )
      const existingNames = new Set(clients.map((c) => String(c.name || '').trim().toLowerCase()).filter(Boolean))

      for (const c of list) {
        const name = (c.name || c.phone || 'Contact').trim()
        const phone = normalizeSaPhone(c.phone) || c.phone || ''
        const phoneKey = String(phone).replace(/\D/g, '')
        if (phoneKey && existingPhones.has(phoneKey)) {
          skipped++
          continue
        }
        if (!phoneKey && existingNames.has(name.toLowerCase())) {
          skipped++
          continue
        }
        await db.add(STORES.clients, {
          name,
          phone,
          email: c.email || '',
          company: '',
          vatNumber: '',
          address: '',
          category: 'walk_in',
          createdAt: new Date().toISOString(),
          source: 'phonebook',
        })
        if (phoneKey) existingPhones.add(phoneKey)
        existingNames.add(name.toLowerCase())
        added++
      }
      await refresh()
      toast(
        added
          ? `Imported ${added} as Walk-in${skipped ? ` (${skipped} skipped)` : ''}`
          : skipped
            ? 'All selected contacts already in your list'
            : 'Nothing imported',
        added ? 'success' : 'info'
      )
    } catch (e) {
      toast(e.message || 'Could not open phone contacts', 'error')
    } finally {
      setBusy(false)
    }
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

  const exportCsv = () => {
    const headers = ['Name', 'Category', 'SLA hours cap', 'SLA used h', 'Company', 'Email', 'Phone', 'VAT', 'Address', 'Outstanding AR', 'Invoices']
    const rows = filtered.map((c) => {
      const u = slaUsage(c, tickets, timeEntries)
      return [
        c.name || '',
        categoryLabel(categoryOf(c)),
        u.capHours ?? '',
        u.usedHours,
        c.company || '',
        c.email || '',
        c.phone || '',
        c.vatNumber || '',
        c.address || '',
        arByClient[String(c.id)] || 0,
        invCountByClient[String(c.id)] || 0,
      ]
    })
    downloadCsv(`clients-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    toast('CSV exported', 'success')
  }

  const chips = [
    { id: 'all', label: 'All', count: catCounts.all },
    ...CLIENT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      count: catCounts[cat.id] || 0,
    })),
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">
            {filtered.length} shown · {clients.length} total
            {totalAr > 0 ? ` · AR ${formatMoney(totalAr)}` : ''}
            {' · COD · SLA hours · Account'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {canPick && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={importFromPhone}>
              {busy ? 'Opening…' : '📱 From phone book'}
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>
            {show ? 'Close' : 'Add client'}
          </button>
        </div>
      </div>

      <div className="sticky-tools toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, VAT…" />
          <Link className="btn btn-outline btn-sm" to="/invoices/new">Invoice client</Link>
        </div>
        <FilterChips options={chips} value={catFilter} onChange={setCatFilter} />
      </div>

      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Name *</label>
            <input className="input focus-ring" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CLIENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label} — {cat.description}</option>
              ))}
            </select>
          </div>
          {(form.category === 'sla' || form.category === 'contract') && (
            <div>
              <label className="label">SLA hours included (cap)</label>
              <input
                className="input"
                type="number"
                min={0}
                step={0.5}
                placeholder="e.g. 10"
                value={form.slaHoursCap}
                onChange={(e) => setForm({ ...form, slaHoursCap: e.target.value })}
              />
              <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                Used hours come from time logged on this client’s job cards.
              </p>
            </div>
          )}
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
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Save client</button>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState
          title={clients.length ? 'No matches' : 'No clients yet'}
          hint={clients.length ? 'Try another category or clear search.' : 'Add clients and tag them COD, SLA, Account, etc.'}
          action={!clients.length ? (
            <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Add client</button>
          ) : null}
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
            const cat = categoryOf(c)
            const usage = slaUsage(c, tickets, timeEntries)
            return (
              <div key={c.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{c.name}</strong>{' '}
                  <span className="muted-pill" style={{ marginLeft: 4 }}>{categoryLabel(cat)}</span>
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
                  {(cat === 'sla' || cat === 'contract' || usage.hasCap || usage.usedHours > 0) && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: usage.over ? 'rgba(239,68,68,.1)' : 'var(--green-soft, rgba(0,122,77,.08))' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        SLA time:{' '}
                        {usage.usedHours}h used
                        {usage.hasCap ? ` / ${usage.capHours}h cap` : ' (no cap set)'}
                        {usage.hasCap && (
                          <span className="muted" style={{ fontWeight: 500 }}>
                            {' '}· {usage.remaining}h left
                          </span>
                        )}
                        {usage.over && <span className="text-danger"> · OVER CAP</span>}
                      </div>
                      {usage.hasCap && (
                        <div className="progress-bar" style={{ marginTop: 6 }}>
                          <span style={{ width: `${usage.pct}%`, background: usage.over ? '#ef4444' : undefined }} />
                        </div>
                      )}
                      <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                        Linked to total time on this client’s job cards (logged + active timers).
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label className="muted" style={{ fontSize: 11 }}>Category</label>
                    <select
                      className="select"
                      style={{ maxWidth: 140, fontSize: 12, padding: '4px 8px' }}
                      value={cat}
                      onChange={(e) => setCategory(c, e.target.value)}
                    >
                      {CLIENT_CATEGORIES.map((x) => (
                        <option key={x.id} value={x.id}>{x.label}</option>
                      ))}
                    </select>
                    {(cat === 'sla' || cat === 'contract') && (
                      <>
                        <label className="muted" style={{ fontSize: 11 }}>SLA h</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step={0.5}
                          style={{ width: 80, fontSize: 12, padding: '4px 8px' }}
                          defaultValue={c.slaHoursCap ?? ''}
                          key={`${c.id}-${c.slaHoursCap}`}
                          onBlur={(e) => setSlaCap(c, e.target.value)}
                          placeholder="Cap"
                        />
                      </>
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
