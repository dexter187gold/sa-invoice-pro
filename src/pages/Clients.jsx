import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { Sync } from '../lib/sync'
import { openWhatsApp, openEmail, buildClientStatement } from '../lib/share'
import { downloadStatementPdf } from '../lib/statementPdf'
import { formatDateZA } from '../components/ui'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, ActionMenu, DataTable,
} from '../components/ui'
import PortalCard from '../components/PortalCard'
import {
  CLIENT_TAG_PRESETS, normalizeTags, filterClientsByTag, toggleClientTag, clientHasTag,
} from '../lib/clientTags'

export default function Clients() {
  const { clients, invoices, payments, company, refresh, toast } = useApp()
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [portalBusyId, setPortalBusyId] = useState(null)
  const [lastPortal, setLastPortal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '', tags: [] })

  const filtered = useMemo(() => {
    let rows = filterClientsByTag(clients, tagFilter)
    rows = rows.filter((c) => matchesQuery(
      { ...c, tagsJoined: normalizeTags(c.tags).join(' ') },
      q,
      ['name', 'email', 'phone', 'company', 'notes', 'tagsJoined'],
    ))
    return rows
  }, [clients, q, tagFilter])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    await db.add(STORES.clients, {
      name: form.name.trim(),
      email: form.email || '',
      phone: form.phone || '',
      company: form.company || '',
      notes: form.notes || '',
      tags: normalizeTags(form.tags),
    })
    setForm({ name: '', email: '', phone: '', company: '', notes: '', tags: [] })
    await refresh()
    toast('Client saved', 'success')
  }

  const cycleTag = async (client, tagId) => {
    const nextTags = toggleClientTag(client.tags, tagId)
    await db.put(STORES.clients, { ...client, tags: nextTags, updatedAt: new Date().toISOString() })
    await refresh()
    toast(nextTags.includes(tagId) ? `Tagged ${tagId}` : `Removed ${tagId}`, 'success')
  }

  const del = (id) => {
    setConfirm({
      title: 'Delete client?',
      message: 'Invoices linked to this client remain but lose the name link.',
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
    ...CLIENT_TAG_PRESETS.map((t) => ({
      id: `tag-${t.id}`,
      label: clientHasTag(c, t.id) ? `− ${t.label}` : `+ ${t.label}`,
      onClick: () => cycleTag(c, t.id),
    })),
    { id: 'del', label: 'Delete', onClick: () => del(c.id), danger: true },
  ]

  const arFor = (clientId) =>
    invoices
      .filter((i) => String(i.clientId) === String(clientId) && ['unpaid', 'partial', 'overdue'].includes(i.status))
      .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)

  const tagChip = (id) => {
    const p = CLIENT_TAG_PRESETS.find((t) => t.id === id)
    return (
      <span
        key={id}
        style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 999,
          background: (p?.color || '#64748b') + '33',
          color: p?.color || '#94a3b8',
          marginRight: 4,
        }}
      >
        {p?.label || id}
      </span>
    )
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">
            {clients.length} clients · tags · portal · statement · WhatsApp
          </p>
        </div>
      </div>

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Phone (WhatsApp)</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Company</label>
          <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CLIENT_TAG_PRESETS.map((t) => {
              const on = form.tags.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`btn btn-sm ${on ? 'btn-secondary' : 'btn-outline'}`}
                  onClick={() => setForm({ ...form, tags: toggleClientTag(form.tags, t.id) })}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Add client</button>
      </form>

      <div className="toolbar sticky-tools" style={{ flexWrap: 'wrap', gap: 8 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search clients…" />
        <select className="input" style={{ width: 'auto' }} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="all">All tags</option>
          {CLIENT_TAG_PRESETS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState title={clients.length ? 'No matches' : 'No clients yet'} hint="Add a client to invoice and open a portal." />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tags</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Open AR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.company ? <div className="muted" style={{ fontSize: 12 }}>{c.company}</div> : null}
                  </td>
                  <td>{normalizeTags(c.tags).map(tagChip)}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{formatMoney(arFor(c.id))}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <ActionMenu label="⋯" items={rowActions(c)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {lastPortal?.clientId || lastPortal?.url ? (
        <div style={{ marginTop: '1rem' }}>
          <PortalCard
            client={
              clients.find((c) => String(c.id) === String(lastPortal.clientId)) || {
                id: lastPortal.clientId,
                name: lastPortal.name,
                phone: '',
                email: '',
              }
            }
            company={company}
            invoices={invoices}
            toast={toast}
            onCreated={(data) => setLastPortal({ ...lastPortal, url: data.url, expires: data.expires })}
          />
          {lastPortal?.url ? (
            <div className="card" style={{ marginTop: 8, borderLeft: '4px solid var(--green, #16a34a)' }}>
              <strong>Active portal link</strong> · {lastPortal.name}
              <div style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>
                <a href={lastPortal.url} target="_blank" rel="noopener noreferrer">{lastPortal.url}</a>
              </div>
              {lastPortal.expires ? (
                <div className="muted" style={{ fontSize: 12 }}>Expires {formatDateZA(lastPortal.expires)}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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
