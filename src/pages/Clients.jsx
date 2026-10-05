
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'

export default function Clients() {
  const { clients, refresh, toast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' })
  const [show, setShow] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    await db.add(STORES.clients, { ...form, name: form.name.trim() })
    setForm({ name: '', email: '', phone: '', company: '' })
    setShow(false)
    await refresh()
    toast('Client saved', 'success')
  }

  const del = async (id) => {
    if (!confirm('Delete client?')) return
    await db.remove(STORES.clients, id)
    await refresh()
    toast('Deleted', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="subtitle">{clients.length} customer(s)</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>{show ? 'Close' : 'Add client'}</button>
      </div>
      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Save client</button>
        </form>
      )}
      {!clients.length ? (
        <div className="card empty">No clients yet. Add your first customer.</div>
      ) : (
        clients.map((c) => (
          <div key={c.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <strong>{c.name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>{[c.company, c.email, c.phone].filter(Boolean).join(' · ')}</div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => del(c.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  )
}
