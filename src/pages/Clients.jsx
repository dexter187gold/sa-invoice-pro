import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, downloadCsv, FilterChips,
} from '../components/ui'
import { contactsPickerSupported, pickContactsFromPhone, normalizeSaPhone } from '../lib/contacts'
import { CLIENT_CATEGORIES, categoryLabel, categoryOf } from '../lib/clientCategories'
import { slaUsage } from '../lib/sla'
import { openWhatsApp, openEmail, buildClientStatement } from '../lib/share'
import { openInvoicesForClient, statementTotals, downloadStatementPdf, shareStatementPdf } from '../lib/statementPdf'

export default function Clients() {
  const { clients, invoices, tickets, timeEntries, company, refresh, toast } = useApp()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod', slaHoursCap: '',
  })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null) // client object
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

  const previewRows = preview ? openInvoicesForClient(preview, invoices) : []
  const previewTotal = statementTotals(previewRows)
  const previewText = preview ? buildClientStatement(preview, invoices, company) : ''

  const sendStatementWa = (client) => {
    const text = buildClientStatement(client, invoices, company)
    const ok = openWhatsApp(client.phone, text)
    toast(ok ? 'Opening WhatsApp statement…' : 'No phone — WhatsApp opened without number', ok ? 'success' : 'info')
  }
  const sendStatementEmail = (client) => {
    const text = buildClientStatement(client, invoices, company).replace(/\*/g, '')
    const ok = openEmail(client.email, `Account statement — ${company?.name || 'SA Invoice Pro'}`, text)
    toast(ok ? 'Opening email statement…' : 'No email on client', ok ? 'success' : 'info')
  }

  const doPdf = async (client, share) => {
    try {
      if (share) {
        const r = await shareStatementPdf(client, invoices, company, {
          channel: 'wa',
          text: buildClientStatement(client, invoices, company),
        })
        if (r.method === 'download-fallback') {
          toast('PDF downloaded — attach it in WhatsApp/email', 'info')
          sendStatementWa(client)
        } else if (r.shared) toast('Shared', 'success')
      } else {
        downloadStatementPdf(client, invoices, company)
        toast('Statement PDF downloaded', 'success')
      }
    } catch (e) {
      toast(e.message || 'PDF failed', 'error')
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
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
      if (!list.length) return toast('No contacts selected', 'info')
      let added = 0
      let skipped = 0
      const existingPhones = new Set(clients.map((c) => String(c.phone || '').replace(/\D/g, '')).filter(Boolean))
      for (const c of list) {
        const name = (c.name || c.phone || 'Contact').trim()
        const phone = normalizeSaPhone(c.phone) || c.phone || ''
        const phoneKey = String(phone).replace(/\D/g, '')
        if (phoneKey && existingPhones.has(phoneKey)) { skipped++; continue }
        await db.add(STORES.clients, {
          name, phone, email: c.email || '', company: '', vatNumber: '', address: '',
          category: 'walk_in', createdAt: new Date().toISOString(), source: 'phonebook',
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

  const exportCsv = () => {
    downloadCsv(`clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Category', 'Email', 'Phone', 'Outstanding AR'],
      filtered.map((c) => [c.name || '', categoryLabel(categoryOf(c)), c.email || '', c.phone || '', arByClient[String(c.id)] || 0])
    )
    toast('CSV exported', 'success')
  }

  const chips = [
    { id: 'all', label: 'All', count: catCounts.all },
    ...CLIENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: catCounts[cat.id] || 0 })),
  ]

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
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone…" />
        <FilterChips options={chips} value={catFilter} onChange={setCatFilter} />
      </div>

      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CLIENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Save client</button>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState title={clients.length ? 'No matches' : 'No clients yet'} />
      ) : (
        filtered
          .slice()
          .sort((a, b) => (arByClient[String(b.id)] || 0) - (arByClient[String(a.id)] || 0))
          .map((c) => {
            const ar = arByClient[String(c.id)] || 0
            const invN = invCountByClient[String(c.id)] || 0
            const cat = categoryOf(c)
            const usage = slaUsage(c, tickets, timeEntries)
            return (
              <div key={c.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{c.name}</strong>{' '}
                  <span className="muted-pill">{categoryLabel(cat)}</span>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {invN} inv{ar > 0 && <> · <strong style={{ color: 'var(--warn)' }}>{formatMoney(ar)}</strong></>}
                  </div>
                  {(cat === 'sla' || usage.hasCap) && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      SLA: {usage.usedHours}h{usage.hasCap ? ` / ${usage.capHours}h` : ''}
                      {usage.over ? ' · OVER' : ''}
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <select className="select" style={{ maxWidth: 140, fontSize: 12 }} value={cat} onChange={(e) => setCategory(c, e.target.value)}>
                      {CLIENT_CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="list-card-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setPreview(c)}>Preview statement</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendStatementWa(c)}>WA</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => sendStatementEmail(c)}>Email</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => doPdf(c, false)}>PDF</button>
                  <Link className="btn btn-secondary btn-sm" to="/invoices/new">Invoice</Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(c.id)}>Del</button>
                </div>
              </div>
            )
          })
      )}

      {/* Live statement preview modal */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setPreview(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto', margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Statement · {preview.name}</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(null)}>Close</button>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              {company?.name || 'SA Invoice Pro'} · {new Date().toISOString().slice(0, 10)}
            </p>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              {[preview.email, preview.phone, preview.address].filter(Boolean).join(' · ') || 'No contact details'}
            </div>

            {!previewRows.length ? (
              <p><strong>No outstanding invoices.</strong></p>
            ) : (
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.number}</td>
                      <td>{String(inv.dueDate || inv.date || '').slice(0, 10)}</td>
                      <td>{inv.status}</td>
                      <td>{formatMoney(inv.amountDue ?? inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p style={{ fontWeight: 700, fontSize: 16 }}>
              Outstanding total: {formatMoney(previewTotal)}
            </p>

            <details style={{ marginBottom: 12 }}>
              <summary className="muted">Message preview (WhatsApp / email)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'var(--surface-2, #f1f5f9)', padding: 12, borderRadius: 8 }}>
                {previewText}
              </pre>
            </details>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => sendStatementWa(preview)}>Send WhatsApp</button>
              <button type="button" className="btn btn-outline" onClick={() => sendStatementEmail(preview)}>Send email</button>
              <button type="button" className="btn btn-primary" onClick={() => doPdf(preview, false)}>Download PDF</button>
              <button type="button" className="btn btn-outline" onClick={() => doPdf(preview, true)}>Share PDF</button>
            </div>
          </div>
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
