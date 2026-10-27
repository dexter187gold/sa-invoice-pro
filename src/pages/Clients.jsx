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
  const { clients, invoices, payments, quotes, tickets, products, services, expenses, company, refresh, toast } = useApp()
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)
  const [portalBusyId, setPortalBusyId] = useState(null)
  const [portalCreds, setPortalCreds] = useState(null)
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

  const preparePortal = async (client) => {
    const syncResult = await Sync.pushAll({
      company, clients, invoices, quotes, tickets, payments, products, services, expenses,
    })
    if (!syncResult?.ok) {
      throw new Error(syncResult?.error || 'Cloud sync did not complete. No portal link was created; try Sync Now and retry.')
    }
    return Sync.createPortalLink(client.id, {
      days: 90,
      snapshot: { company, client, quotes, invoices },
    })
  }

  const createPortal = async (client) => {
    if (!Sync.isLoggedIn()) return toast('Log in to Cloud under Settings first', 'error')
    setPortalBusyId(client.id)
    try {
      const data = await preparePortal(client)
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

  const issuePortalLogin = async (client) => {
    if (!client?.email) return toast('Client needs an email for portal login', 'error')
    if (!Sync.isLoggedIn()) return toast('Log in to Cloud under Settings first', 'error')
    setPortalBusyId(client.id)
    try {
      await Sync.pushAll({
        company, clients, invoices, quotes, tickets, payments, products, services, expenses,
      })
      const data = await Sync.issueClientPortalLogin({
        clientId: client.id,
        email: client.email,
        name: client.name,
        company,
        client,
      })
      setPortalCreds({
        name: client.name,
        email: data.email,
        pin: data.pin,
        portalUrl: data.portalUrl,
        loginHint: data.loginHint,
      })
      const msg = `Portal login\n${data.email}\nPIN: ${data.pin}\n${data.portalUrl || ''}`
      try {
        await navigator.clipboard.writeText(msg)
        toast('Portal login created & copied', 'success')
      } catch {
        toast('Portal login created — save the PIN shown', 'success')
      }
    } catch (e) {
      toast(e.message || 'Could not issue portal login', 'error')
    } finally {
      setPortalBusyId(null)
    }
  }

  const statementText = (client) => buildClientStatement(client, invoices, company, payments)

  const rowActions = (c) => [
    { id: 'portal', label: portalBusyId === c.id ? 'Portal…' : 'Magic link', onClick: () => createPortal(c) },
    { id: 'portal-login', label: portalBusyId === c.id ? 'Login…' : 'Portal login', onClick: () => issuePortalLogin(c) },
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
      id: 'pdf-st',
      label: 'PDF statement',
      onClick: async () => {
        try {
          await downloadStatementPdf(c, invoices, company, payments)
          toast('Statement PDF ready', 'success')
        } catch (e) {
          toast(e.message || 'PDF failed', 'error')
        }
      },
    },
    { id: 'del', label: 'Delete', danger: true, onClick: () => del(c.id) },
  ]

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">
            {clients.length} clients · tags · portal login · statement · WhatsApp
          </p>
        </div>
      </div>

      {portalCreds && (
        <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid var(--green, #22c55e)' }}>
          <strong>Portal login for {portalCreds.name}</strong>
          <p className="muted" style={{ margin: '6px 0' }}>
            Share with the customer (PIN shown once):
          </p>
          <div style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
            <div>URL: {portalCreds.portalUrl}</div>
            <div>Email: {portalCreds.email}</div>
            <div>PIN: <strong>{portalCreds.pin}</strong></div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => {
              const msg = `Portal login\n${portalCreds.email}\nPIN: ${portalCreds.pin}\n${portalCreds.portalUrl || ''}`
              navigator.clipboard?.writeText(msg)
              toast('Copied', 'success')
            }}>Copy again</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPortalCreds(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <form className="card form-grid" onSubmit={save} style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Name</label>
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
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary">Add client</button>
      </form>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search clients…" />
        <select className="input" style={{ maxWidth: 160 }} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="all">All tags</option>
          {CLIENT_TAG_PRESETS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState title={clients.length ? 'No matches' : 'No clients yet'} hint="Add a client to invoice and open a portal." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Tags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong>{c.company ? <div className="muted" style={{ fontSize: 12 }}>{c.company}</div> : null}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {CLIENT_TAG_PRESETS.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ opacity: clientHasTag(c.tags, t.id) ? 1 : 0.45, fontSize: 11 }}
                        onClick={() => cycleTag(c, t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td><ActionMenu items={rowActions(c)} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {lastPortal?.clientId || lastPortal?.url ? (
        <div style={{ marginTop: 16 }}>
          <PortalCard
            client={
              clients.find((x) => String(x.id) === String(lastPortal.clientId)) || {
                id: lastPortal.clientId,
                name: lastPortal.name,
                phone: '',
                email: '',
              }
            }
            company={company}
            invoices={invoices}
            toast={toast}
            preparePortal={preparePortal}
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
