
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { isValidSaId, ageFromSaId } from '../lib/saTaxEngine'

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

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast('Name required', 'error')
    if (form.idNumber && !isValidSaId(form.idNumber)) {
      if (!confirm('SA ID failed Luhn checksum. Save anyway?')) return
    }
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
    await refresh()
    toast('Employee saved', 'success')
  }

  const del = async (id) => {
    if (!confirm('Remove employee?')) return
    await db.remove(STORES.employees, id)
    await refresh()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="subtitle">SA payroll helpers · UIF · ID checksum · feeds Payroll runs</p>
        </div>
      </div>
      <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="ID / passport (13-digit SA ID validated)" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
        <input className="input" placeholder="Tax reference number" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
        <input className="input" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input className="input" type="number" step="0.01" placeholder="Monthly salary (ZAR)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        <input className="input" type="number" step="0.01" placeholder="Travel allowance (ZAR)" value={form.transportAllowance} onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })} />
        <input className="input" type="number" step="0.01" placeholder="Other taxable allowance" value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: e.target.value })} />
        <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="number" min="0" max="24" placeholder="ETI months claimed (0–24)" value={form.etiMonth} onChange={(e) => setForm({ ...form, etiMonth: e.target.value })} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={form.uif} onChange={(e) => setForm({ ...form, uif: e.target.checked })} />
          UIF applicable
        </label>
        <button className="btn btn-primary" type="submit">Add employee</button>
      </form>
      {employees.map((emp) => {
        const idOk = emp.idNumber ? isValidSaId(emp.idNumber) : null
        return (
          <div key={emp.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{emp.name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {emp.role || 'Staff'} · {formatMoney(emp.salary)}/mo
                {emp.uif !== false ? ' · UIF' : ''}
                {emp.idNumber ? ` · ${emp.idNumber}` : ''}
                {idOk === true && ' · ID✓'}
                {idOk === false && ' · ID✗'}
                {emp.taxNumber ? ` · Tax ${emp.taxNumber}` : ''}
              </div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => del(emp.id)}>Del</button>
          </div>
        )
      })}
      {!employees.length && <div className="card empty">No employees.</div>}
    </div>
  )
}
