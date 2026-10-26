import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState } from '../components/ui'
import {
  listBranches, upsertBranch, removeBranch, getActiveBranchId, setActiveBranchId,
} from '../lib/branches'
import { listLoaners, upsertLoaner, checkOutLoaner, checkInLoaner } from '../lib/loaners'

export default function Branches() {
  const { toast, clients } = useApp()
  const [branches, setBranches] = useState([])
  const [active, setActive] = useState('')
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' })
  const [loaners, setLoaners] = useState([])
  const [loanForm, setLoanForm] = useState({ label: '', type: 'laptop', serial: '' })

  const reload = async () => {
    setBranches(await listBranches())
    setActive((await getActiveBranchId()) || '')
    setLoaners(await listLoaners())
  }
  useEffect(() => { reload() }, [])

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Branch name required', 'error')
    await upsertBranch(form)
    setForm({ name: '', code: '', address: '', phone: '' })
    await reload()
    toast('Branch saved', 'success')
  }

  const switchBr = async (id) => {
    await setActiveBranchId(id)
    setActive(id)
    toast(id ? 'Branch active — lists filter to this shop' : 'Showing all branches', 'success')
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Branches & loaners</h1>
          <p className="subtitle">Multi-branch workspaces · loaner pool · {branches.length} branches</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => switchBr('')}>Show all</button>
      </div>

      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Branch name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sandton workshop" required />
        </div>
        <div>
          <label className="label">Code</label>
          <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="JHB" maxLength={8} />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary">Add branch</button>
      </form>

      {!branches.length ? (
        <EmptyState title="Single-shop mode" hint="Add a second location when you grow — data tags by branch." />
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          {branches.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border,rgba(255,255,255,.08))', flexWrap: 'wrap' }}>
              <div>
                <strong>{b.name}</strong> {b.code ? <span className="muted">({b.code})</span> : null}
                {active === b.id ? <span style={{ marginLeft: 8, color: 'var(--green,#22c55e)', fontSize: 12 }}>ACTIVE</span> : null}
                <div className="muted" style={{ fontSize: 12 }}>{b.address || '—'} {b.phone ? `· ${b.phone}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => switchBr(b.id)}>Switch</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={async () => { await removeBranch(b.id); await reload() }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18 }}>Loaner devices</h2>
      <form className="card form-grid cols-2" style={{ marginBottom: 12 }} onSubmit={async (e) => {
        e.preventDefault()
        await upsertLoaner(loanForm)
        setLoanForm({ label: '', type: 'laptop', serial: '' })
        await reload()
        toast('Loaner added', 'success')
      }}>
        <div>
          <label className="label">Label</label>
          <input className="input" value={loanForm.label} onChange={(e) => setLoanForm({ ...loanForm, label: e.target.value })} placeholder="Dell 5420 #3" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={loanForm.type} onChange={(e) => setLoanForm({ ...loanForm, type: e.target.value })}>
            <option value="laptop">Laptop</option>
            <option value="phone">Phone</option>
            <option value="tablet">Tablet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Serial</label>
          <input className="input" value={loanForm.serial} onChange={(e) => setLoanForm({ ...loanForm, serial: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-outline">Add loaner</button>
      </form>

      <div className="card">
        {!loaners.length ? <p className="muted">No loaners yet</p> : loaners.map((l) => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border,rgba(255,255,255,.06))', flexWrap: 'wrap' }}>
            <div>
              <strong>{l.label}</strong> · {l.type} · <span className="muted">{l.status}</span>
              {l.serial ? <div className="muted" style={{ fontSize: 11 }}>S/N {l.serial}</div> : null}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {l.status === 'available' ? (
                <button type="button" className="btn btn-sm btn-primary" onClick={async () => {
                  const clientId = clients[0]?.id
                  if (!clientId) return toast('Add a client first', 'info')
                  await checkOutLoaner(l.id, { clientId })
                  await reload()
                  toast('Checked out', 'success')
                }}>Check out</button>
              ) : (
                <button type="button" className="btn btn-sm btn-outline" onClick={async () => {
                  await checkInLoaner(l.id)
                  await reload()
                  toast('Checked in', 'success')
                }}>Check in</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageFade>
  )
}
