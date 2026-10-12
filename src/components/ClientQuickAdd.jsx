import React, { useState } from 'react'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { contactsPickerSupported, pickContactsFromPhone, normalizeSaPhone } from '../lib/contacts'
import { CLIENT_CATEGORIES } from '../lib/clientCategories'

export default function ClientQuickAdd({
  clients = [],
  value = '',
  onChange,
  refresh,
  toast,
  required = false,
  label = 'Client',
  onClientCreated,
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', category: 'cod' })
  const [busy, setBusy] = useState(false)
  const canPick = contactsPickerSupported()

  const save = async () => {
    if (!form.name.trim()) {
      toast?.('Client name required', 'error')
      return
    }
    setBusy(true)
    try {
      const row = await db.add(STORES.clients, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        category: form.category || 'cod',
        createdAt: new Date().toISOString(),
      })
      await refresh?.()
      onChange?.(row.id)
      onClientCreated?.(row)
      setForm({ name: '', email: '', phone: '', company: '', category: 'cod' })
      setOpen(false)
      toast?.('Client added', 'success')
    } catch (e) {
      toast?.(e.message || 'Could not save client', 'error')
    } finally {
      setBusy(false)
    }
  }

  const fromPhone = async () => {
    setBusy(true)
    try {
      const list = await pickContactsFromPhone({ multiple: false })
      if (!list.length) {
        toast?.('No contact selected', 'info')
        return
      }
      const c = list[0]
      setForm({
        name: c.name || '',
        email: c.email || '',
        phone: normalizeSaPhone(c.phone) || c.phone || '',
        company: '',
        category: 'cod',
      })
      setOpen(true)
      toast?.('Contact loaded — set category and Save client', 'success')
    } catch (e) {
      toast?.(e.message || 'Could not open contacts', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {label ? <label className="label">{label}{required ? ' *' : ''}</label> : null}
      <select
        className="select"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
      >
        <option value="">Select client…</option>
        {(clients || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.category ? ` [${String(c.category).toUpperCase()}]` : ''}{c.phone ? ` · ${c.phone}` : ''}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((s) => !s)}>
          {open ? 'Hide' : '+ New client'}
        </button>
        {canPick && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={fromPhone}>
            📱 From phone
          </button>
        )}
      </div>
      {open && (
        <div className="form-grid" style={{ marginTop: 8, gap: 6 }}>
          <input className="input" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CLIENT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label} — {cat.description}</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save client'}
          </button>
        </div>
      )}
      {!canPick && (
        <p className="muted" style={{ fontSize: 11, marginTop: 6, marginBottom: 0 }}>
          Phone book import works in Chrome/Edge on Android (HTTPS). Otherwise add clients manually.
        </p>
      )}
    </div>
  )
}
