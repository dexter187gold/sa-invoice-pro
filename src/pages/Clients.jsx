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
import { buildClientLedger } from '../lib/payments'
import { Sync } from '../lib/sync'

export default function Clients() {
  const { clients, invoices, payments, tickets, timeEntries, company, refresh, toast } = useApp()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', vatNumber: '', address: '', category: 'cod', slaHoursCap: '',
  })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [portalBusyId, setPortalBusyId] = useState(null)
  const [lastPortal, setLastPortal] = useState(null)
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
  const previewLedger = preview ? buildClientLedger(preview, invoices, payments) : null
  const previewText = preview ? buildClientStatement(preview, invoices, company, payments) : ''

  const sendStatementWa = (client) => {
    const text = buildClientStatement(client, invoices, company, payments)
    const ok = openWhatsApp(client.phone, text)
    toast(ok ? 'Opening WhatsApp statement…' : 'No phone — WhatsApp opened without number', ok ? 'success' : 'info')
  }
  const sendStatementEmail = (client) => {
    const text = buildClientStatement(client, invoices, company, payments).replace(/\*/g, '')
    const ok = openEmail(client.email, `Account statement — ${company?.name || 'SA Invoice Pro'}`, text)
    toast(ok ? 'Opening email statement…' : 'No email on client', ok ? 'success' : 'info')
  }

  const doPdf = async (client, share) => {
    try {
      if (share) {
        const r = await shareStatementPdf(client, invoices, company, {
          channel: 'wa',
          text: buildClientStatement(client, invoices, company, payments),
          payments,
        })
        if (r.method === 'download-fallback') {
          toast('PDF downloaded — attach it in WhatsApp/email', 'info')
          sendStatementWa(client)
        } else if (r.shared) toast('Shared', 'success')
      } else {
        downloadStatementPdf(client, invoices, company, payments)
        toast('Statement PDF downloaded', 'success')
      }
    } catch (e) {
      toast(e.message || 'PDF failed', 'error')
    }
  }

  const createPortal = async (client) => {
    if (!Sync.isLoggedIn()) {
      return toast('Log in to Cloud under Settings first', 'error')
    }
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

  const sharePortalWa = (client) => {
    const url = lastPortal?.clientId === client.id ? lastPortal.url : null
    if (!url) {
      toast('Create portal link first', 'info')
      return createPortal(client)
    }
    const co = company?.name || 'SA Invoice Pro'
    const text = [
      `Hi ${client.name || 'there'},`,
      '',
      `Your private *${co}* account portal:`,
      url,
      '',
      'View invoices, quotes, job cards and payments.',
      'Please do not share this link.',
    ].join('\n')
    openWhatsApp(client.phone, text)
    toast('Opening WhatsApp with portal link…', 'success')
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
            {' · portal · PDF'}
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

      {lastPortal && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--green, #007A4D)' }}>
          <strong>Portal ready — {lastPortal.name}</strong>
          <div style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 6 }}>
            <a href={lastPortal.url} target="_blank" rel="noreferrer">{lastPortal.url}</a>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            Expires {String(lastPortal.expires || '').slice(0, 10)} · Copied to clipboard when created
          </p>
        </div>
      )}

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
            const portalActive = lastPortal?.clientId === c.id
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
                    {portalActive && <span className="muted"> · portal ready</span>}
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
                  <button type="button" className="btn btn-primary btn-sm" disabled={portalBusyId === c.id} onClick={() => createPortal(c)} title="Create secure client portal link">
                    {portalBusyId === c.id ? '…' : 'Portal'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => sharePortalWa(c)} title="WhatsApp portal link">Portal WA</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(c)}>Statement</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => doPdf(c, false)}>PDF</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendStatementWa(c)}>WA</button>
                  <Link className="btn btn-secondary btn-sm" to="/invoices/new">Invoice</Link>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => del(c.id)}>Del</button>
                </div>
              </div>
            )
          })
      )}

      {preview && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPreview(null)}>
          <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Statement · {preview.name}</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(null)}>Close</button>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              {company?.name || 'SA Invoice Pro'} · {new Date().toISOString().slice(0, 10)}
            </p>
            {!(previewLedger?.lines || []).length ? (
              <p><strong>No activity on this account.</strong></p>
            ) : (
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewLedger?.lines || []).map((row) => (
                    <tr key={`${row.type}-${row.id}`}>
                      <td>{row.date}</td>
                      <td>{row.description}</td>
                      <td>{row.debit ? formatMoney(row.debit) : ''}</td>
                      <td>{row.credit ? formatMoney(row.credit) : ''}</td>
                      <td>{formatMoney(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontWeight: 700, fontSize: 16 }}>Outstanding: {formatMoney(previewLedger?.outstanding ?? previewTotal)}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => sendStatementWa(preview)}>WhatsApp</button>
              <button type="button" className="btn btn-outline" onClick={() => sendStatementEmail(preview)}>Email</button>
              <button type="button" className="btn btn-primary" onClick={() => doPdf(preview, false)}>Download PDF</button>
              <button type="button" className="btn btn-outline" onClick={() => createPortal(preview)}>Portal link</button>
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
