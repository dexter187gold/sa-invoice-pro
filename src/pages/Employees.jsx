import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { isValidSaId, ageFromSaId } from '../lib/saTaxEngine'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatCard,
} from '../components/ui'

const empty = {
  name: '',
  idNumber: '',
  taxNumber: '',
  role: '',
  salary: '',
  transportAllowance: '',
  otherAllowance: '',
  uif: true,
  email: '',
  etiMonth: '0',
}

export default function Employees() {
  const { employees, refresh, toast } = useApp()
  const [form, setForm] = useState({ ...empty })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState(null)

  const filtered = useMemo(
    () => employees.filter((e) => matchesQuery(e, q, ['name', 'role', 'idNumber', 'taxNumber', 'email'])),
    [employees, q]
  )

  const payrollCost = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0)
  const uifCount = employees.filter((e) => e.uif !== false).length

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    if (form.idNumber && !isValidSaId(form.idNumber)) {
      setConfirm({
        title: 'SA ID checksum failed',
        message: 'The ID number failed the Luhn check. Save employee anyway?',
        danger: false,
        confirmLabel: 'Save anyway',
        action: async () => {
          await doSave()
          setConfirm(null)
        },
      })
      return
    }
    await doSave()
  }

  const doSave = async () => {
    const age = form.idNumber ? ageFromSaId(form.idNumber) : null
    await db.add(STORES.employees, {
      ...form,
      name: form.name.trim(),
      salary: Number(form.salary) || 0,
      transportAllowance: Number(form.transportAllowance) || 0,
      otherAllowance: Number(form.otherAllowance) || 0,
      uif: !!form.uif,
      etiMonth: Number(form.etiMonth) || 0,
      age: age ?? undefined,
    })
    setForm({ ...empty })
    setShow(false)
    await refresh()
    toast('Employee saved', 'success')
  }

  const del = (id) => {
    setConfirm({
      title: 'Remove employee?',
      message: 'Payslip history is kept. This only removes the employee record.',
      danger: true,
      confirmLabel: 'Remove',
      action: async () => {
        await db.remove(STORES.employees, id)
        await refresh()
        toast('Removed', 'success')
        setConfirm(null)
      },
    })
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="subtitle">
            SA payroll helpers · UIF · ID checksum · {employees.length} staff
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/payroll">Run payroll</Link>
          <button type="button" className="btn btn-primary" onClick={() => setShow((s) => !s)}>
            {show ? 'Close' : 'Add employee'}
          </button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Headcount" value={employees.length} />
        <StatCard label="Monthly salary bill" value={formatMoney(payrollCost)} />
        <StatCard label="UIF applicable" value={uifCount} hint={`${employees.length - uifCount} excluded`} />
      </div>

      <div className="sticky-tools toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, role, ID, tax…" />
      </div>

      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label">Full name *</label>
            <input className="input focus-ring" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="label">ID / passport</label>
            <input className="input" placeholder="13-digit SA ID validated" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Tax reference</label>
            <input className="input" placeholder="Tax reference number" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div>
            <label className="label">Monthly salary (ZAR)</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </div>
          <div>
            <label className="label">Travel allowance</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.transportAllowance} onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })} />
          </div>
          <div>
            <label className="label">Other taxable allowance</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">ETI months claimed (0–24)</label>
            <input className="input" type="number" min="0" max="24" value={form.etiMonth} onChange={(e) => setForm({ ...form, etiMonth: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.uif} onChange={(e) => setForm({ ...form, uif: e.target.checked })} />
            UIF applicable
          </label>
          <button className="btn btn-primary" type="submit">Save employee</button>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState
          title={employees.length ? 'No matches' : 'No employees yet'}
          hint={employees.length ? 'Clear search to see everyone.' : 'Add staff before running payroll.'}
          action={!employees.length ? <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>Add employee</button> : null}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((emp) => {
            const idOk = emp.idNumber ? isValidSaId(emp.idNumber) : null
            return (
              <div key={emp.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{emp.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {emp.role || 'Staff'} · {formatMoney(emp.salary)}/mo
                    {emp.uif !== false ? ' · UIF' : ' · no UIF'}
                    {emp.idNumber ? ` · ${emp.idNumber}` : ''}
                    {idOk === true && <span className="badge" style={{ marginLeft: 6 }}>ID OK</span>}
                    {idOk === false && <span className="badge bad" style={{ marginLeft: 6 }}>ID fail</span>}
                    {emp.taxNumber ? ` · Tax ${emp.taxNumber}` : ''}
                  </div>
                  {emp.email ? <div className="muted" style={{ fontSize: 12 }}>{emp.email}</div> : null}
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => del(emp.id)}>Remove</button>
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
