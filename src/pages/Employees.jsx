import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { isValidSaId, ageFromSaId } from '../lib/saTaxEngine'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatCard, downloadCsv, ActionMenu,
} from '../components/ui'

const empty = {
  id: undefined,
  name: '',
  knownAs: '',
  employeeNumber: '',
  idNumber: '',
  taxNumber: '',
  role: '',
  jobGrade: '',
  companyRule: '',
  accountNumber: '',
  branchCode: '',
  hoursPerPeriod: '',
  mibcoLevy: '',
  mibcoEmployer: '',
  pensionEmployer: '',
  pensionRiskEmployer: '',
  fringeBenefits: '',
  taxDeductibleDeductions: '',
  annualLeaveEntitlement: '',
  annualLeaveOpening: '',
  annualLeaveAccrued: '',
  annualLeaveClosing: '',
  salary: '',
  transportAllowance: '',
  otherAllowance: '',
  callOutAllowance: '',
  overtime15: '',
  overtime20: '',
  standbyAllowance: '',
  siteAllowance: '',
  sundayHolidayPay: '',
  commission: '',
  bonus: '',
  otherEarnings: '',
  uif: true,
  email: '',
  phone: '',
  address: '',
  employmentStart: '',
  payFrequency: 'Monthly',
  paymentMethod: 'EFT',
  ordinaryHoursWorked: '',
  overtimeHoursWorked: '',
  sundayHoursWorked: '',
  publicHolidayHoursWorked: '',
  hourlyRate: '',
  pensionEmployee: '',
  medicalAidEmployee: '',
  unionFees: '',
  otherDeductions: '',
  etiMonth: '0',
  status: 'active',
}

function toForm(emp = {}) {
  return {
    ...empty,
    ...emp,
    id: emp.id,
    name: emp.name || '',
    knownAs: emp.knownAs || '',
    employeeNumber: emp.employeeNumber || '',
    idNumber: emp.idNumber || '',
    taxNumber: emp.taxNumber || '',
    role: emp.role || '',
    jobGrade: emp.jobGrade || '',
    companyRule: emp.companyRule || '',
    accountNumber: emp.accountNumber || '',
    branchCode: emp.branchCode || '',
    hoursPerPeriod: emp.hoursPerPeriod ?? '',
    mibcoLevy: emp.mibcoLevy ?? '',
    mibcoEmployer: emp.mibcoEmployer ?? '',
    pensionEmployer: emp.pensionEmployer ?? '',
    pensionRiskEmployer: emp.pensionRiskEmployer ?? '',
    fringeBenefits: emp.fringeBenefits ?? '',
    taxDeductibleDeductions: emp.taxDeductibleDeductions ?? '',
    annualLeaveEntitlement: emp.annualLeaveEntitlement ?? '',
    annualLeaveOpening: emp.annualLeaveOpening ?? '',
    annualLeaveAccrued: emp.annualLeaveAccrued ?? '',
    annualLeaveClosing: emp.annualLeaveClosing ?? '',
    salary: emp.salary ?? '',
    transportAllowance: emp.transportAllowance ?? '',
    otherAllowance: emp.otherAllowance ?? '',
    callOutAllowance: emp.callOutAllowance ?? '',
    overtime15: emp.overtime15 ?? '',
    overtime20: emp.overtime20 ?? '',
    standbyAllowance: emp.standbyAllowance ?? '',
    siteAllowance: emp.siteAllowance ?? '',
    sundayHolidayPay: emp.sundayHolidayPay ?? '',
    commission: emp.commission ?? '',
    bonus: emp.bonus ?? '',
    otherEarnings: emp.otherEarnings ?? '',
    uif: emp.uif !== false,
    email: emp.email || '',
    phone: emp.phone || '',
    address: emp.address || '',
    employmentStart: emp.employmentStart || '',
    payFrequency: emp.payFrequency || 'Monthly',
    paymentMethod: emp.paymentMethod || 'EFT',
    ordinaryHoursWorked: emp.ordinaryHoursWorked ?? '',
    overtimeHoursWorked: emp.overtimeHoursWorked ?? '',
    sundayHoursWorked: emp.sundayHoursWorked ?? '',
    publicHolidayHoursWorked: emp.publicHolidayHoursWorked ?? '',
    hourlyRate: emp.hourlyRate ?? '',
    pensionEmployee: emp.pensionEmployee ?? '',
    medicalAidEmployee: emp.medicalAidEmployee ?? '',
    unionFees: emp.unionFees ?? '',
    otherDeductions: emp.otherDeductions ?? '',
    etiMonth: emp.etiMonth ?? '0',
    status: emp.status === 'archived' ? 'archived' : 'active',
  }
}

function n(v) {
  return Number(v) || 0
}

export default function Employees() {
  const { employees, refresh, toast } = useApp()
  const [form, setForm] = useState({ ...empty })
  const [show, setShow] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const isEdit = !!form.id

  const filtered = useMemo(() => {
    let rows = employees.filter((e) => matchesQuery(e, q, ['name', 'role', 'idNumber', 'taxNumber', 'email', 'employeeNumber', 'phone']))
    if (statusFilter === 'active') rows = rows.filter((e) => e.status !== 'archived')
    if (statusFilter === 'archived') rows = rows.filter((e) => e.status === 'archived')
    return rows
  }, [employees, q, statusFilter])

  const activeStaff = employees.filter((e) => e.status !== 'archived')
  const payrollCost = activeStaff.reduce((s, e) => s + (Number(e.salary) || 0), 0)
  const uifCount = activeStaff.filter((e) => e.uif !== false).length

  const openForm = (emp) => {
    setForm(emp ? toForm(emp) : { ...empty })
    setShow(true)
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {}
  }

  const closeForm = () => {
    setForm({ ...empty })
    setShow(false)
  }

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
    setBusy(true)
    try {
      const age = form.idNumber ? ageFromSaId(form.idNumber) : null
      const row = {
        ...form,
        name: form.name.trim(),
        employeeNumber: String(form.employeeNumber || '').trim(),
        knownAs: String(form.knownAs || '').trim(),
        jobGrade: String(form.jobGrade || '').trim(),
        companyRule: String(form.companyRule || '').trim(),
        accountNumber: String(form.accountNumber || '').trim(),
        branchCode: String(form.branchCode || '').trim(),
        salary: n(form.salary),
        transportAllowance: n(form.transportAllowance),
        otherAllowance: n(form.otherAllowance),
        callOutAllowance: n(form.callOutAllowance),
        overtime15: n(form.overtime15),
        overtime20: n(form.overtime20),
        standbyAllowance: n(form.standbyAllowance),
        siteAllowance: n(form.siteAllowance),
        sundayHolidayPay: n(form.sundayHolidayPay),
        commission: n(form.commission),
        bonus: n(form.bonus),
        otherEarnings: n(form.otherEarnings),
        pensionEmployee: n(form.pensionEmployee),
        medicalAidEmployee: n(form.medicalAidEmployee),
        unionFees: n(form.unionFees),
        otherDeductions: n(form.otherDeductions),
        hourlyRate: n(form.hourlyRate),
        mibcoLevy: n(form.mibcoLevy),
        mibcoEmployer: n(form.mibcoEmployer),
        pensionEmployer: n(form.pensionEmployer),
        pensionRiskEmployer: n(form.pensionRiskEmployer),
        fringeBenefits: n(form.fringeBenefits),
        taxDeductibleDeductions: n(form.taxDeductibleDeductions),
        annualLeaveEntitlement: n(form.annualLeaveEntitlement),
        annualLeaveOpening: n(form.annualLeaveOpening),
        annualLeaveAccrued: n(form.annualLeaveAccrued),
        annualLeaveClosing: n(form.annualLeaveClosing),
        hoursPerPeriod: n(form.hoursPerPeriod),
        ordinaryHoursWorked: n(form.ordinaryHoursWorked),
        overtimeHoursWorked: n(form.overtimeHoursWorked),
        sundayHoursWorked: n(form.sundayHoursWorked),
        publicHolidayHoursWorked: n(form.publicHolidayHoursWorked),
        uif: !!form.uif,
        etiMonth: n(form.etiMonth),
        status: form.status === 'archived' ? 'archived' : 'active',
        age: age ?? undefined,
        updatedAt: new Date().toISOString(),
      }

      if (row.id) {
        await db.put(STORES.employees, row)
        toast('Employee updated', 'success')
      } else {
        delete row.id
        await db.add(STORES.employees, row)
        toast('Employee saved', 'success')
      }
      closeForm()
      await refresh()
    } catch (err) {
      toast(err?.message || 'Could not save employee', 'error')
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    downloadCsv(
      `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Number', 'ID number', 'Tax number', 'Role', 'Salary', 'UIF', 'Status', 'Email', 'Phone', 'Age'],
      filtered.map((e) => [
        e.name || '',
        e.employeeNumber || '',
        e.idNumber || '',
        e.taxNumber || '',
        e.role || '',
        Number(e.salary) || 0,
        e.uif !== false ? 'yes' : 'no',
        e.status === 'archived' ? 'archived' : 'active',
        e.email || '',
        e.phone || '',
        e.age ?? (e.idNumber ? ageFromSaId(e.idNumber) : '') ?? '',
      ]),
    )
    toast('CSV exported', 'success')
  }

  const del = (emp) => {
    setConfirm({
      title: 'Delete employee?',
      message: `Remove ${emp.name || 'this employee'} permanently? Payslip history is kept. Prefer Archive if they may return.`,
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        try {
          if (emp?.id == null) throw new Error('Missing employee id')
          await db.remove(STORES.employees, emp.id)
          await refresh()
          toast('Employee deleted', 'success')
          if (form.id === emp.id) closeForm()
        } catch (err) {
          toast(err?.message || 'Delete failed', 'error')
        } finally {
          setConfirm(null)
        }
      },
    })
  }

  const archive = async (emp) => {
    try {
      const next = { ...emp, status: emp.status === 'archived' ? 'active' : 'archived', updatedAt: new Date().toISOString() }
      await db.put(STORES.employees, next)
      await refresh()
      toast(next.status === 'archived' ? 'Archived' : 'Restored to active', 'success')
    } catch (err) {
      toast(err?.message || 'Could not update status', 'error')
    }
  }

  const duplicate = (emp) => {
    const copy = toForm(emp)
    delete copy.id
    copy.name = `${emp.name || 'Employee'} (copy)`
    copy.employeeNumber = ''
    openForm(copy)
    toast('Editing a copy — save to create', 'info')
  }

  const rowActions = (emp) => [
    { id: 'edit', label: 'Edit', onClick: () => openForm(emp) },
    { id: 'dup', label: 'Duplicate', onClick: () => duplicate(emp) },
    {
      id: 'arch',
      label: emp.status === 'archived' ? 'Restore' : 'Archive',
      onClick: () => archive(emp),
    },
    { id: 'del', label: 'Delete', danger: true, onClick: () => del(emp) },
  ]

  const field = (key, label, opts = {}) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={opts.type || 'text'}
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: opts.type === 'checkbox' ? e.target.checked : e.target.value })}
        placeholder={opts.placeholder}
        required={!!opts.required}
        autoFocus={!!opts.autoFocus}
      />
    </div>
  )

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="subtitle">
            Edit · archive · delete · SA payroll helpers · {activeStaff.length} active
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <Link className="btn btn-secondary" to="/payroll">Run payroll</Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (show && !isEdit ? closeForm() : openForm(null))}
          >
            {show && !isEdit ? 'Close' : 'Add employee'}
          </button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: '1rem' }}>
        <StatCard label="Active headcount" value={activeStaff.length} />
        <StatCard label="Monthly salary bill" value={formatMoney(payrollCost)} />
        <StatCard label="UIF applicable" value={uifCount} hint={`${activeStaff.length - uifCount} excluded`} />
      </div>

      <div className="sticky-tools toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, role, ID, tax, phone…" />
        <select className="input" style={{ maxWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {show && (
        <form className="card form-grid cols-2" onSubmit={save} style={{ marginBottom: '1rem' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong>{isEdit ? `Edit · ${form.name || 'employee'}` : 'New employee'}</strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={closeForm}>Cancel</button>
          </div>
          {field('name', 'Full name *', { required: true, autoFocus: true })}
          {field('employeeNumber', 'Employee / payroll number', { placeholder: 'e.g. EMP-001' })}
          {field('knownAs', 'Known as / preferred name')}
          {field('role', 'Role / job title')}
          {field('jobGrade', 'Job grade / band')}
          {field('idNumber', 'SA ID number')}
          {field('taxNumber', 'Tax number')}
          {field('email', 'Email', { type: 'email' })}
          {field('phone', 'Phone')}
          {field('employmentStart', 'Employment start', { type: 'date' })}
          {field('salary', 'Monthly salary (ZAR)', { type: 'number' })}
          {field('hourlyRate', 'Hourly rate', { type: 'number' })}
          {field('transportAllowance', 'Transport / travel', { type: 'number' })}
          {field('otherAllowance', 'Other allowance', { type: 'number' })}
          {field('pensionEmployee', 'Pension (employee)', { type: 'number' })}
          {field('medicalAidEmployee', 'Medical aid (employee)', { type: 'number' })}
          {field('accountNumber', 'Bank account number')}
          {field('branchCode', 'Branch code')}
          <div>
            <label className="label">Pay frequency</label>
            <select className="input" value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value })}>
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Fortnightly</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={!!form.uif} onChange={(e) => setForm({ ...form, uif: e.target.checked })} />
            UIF applicable
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Update employee' : 'Save employee'}
            </button>
            {isEdit && (
              <button type="button" className="btn btn-outline" onClick={() => del(form)} disabled={busy}>
                Delete
              </button>
            )}
          </div>
        </form>
      )}

      {!filtered.length ? (
        <EmptyState
          title={employees.length ? 'No matches' : 'No employees yet'}
          hint={employees.length ? 'Try another filter or clear search.' : 'Add staff before running payroll.'}
          action={!employees.length ? <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>Add employee</button> : null}
        />
      ) : (
        filtered
          .slice()
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
          .map((emp) => {
            const idOk = emp.idNumber ? isValidSaId(emp.idNumber) : null
            return (
              <div key={emp.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{emp.name}</strong>
                  {emp.status === 'archived' ? <span className="badge" style={{ marginLeft: 8 }}>Archived</span> : null}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {emp.role || 'Staff'} · {formatMoney(emp.salary)}/mo
                    {emp.uif !== false ? ' · UIF' : ' · no UIF'}
                    {(emp.age ?? (emp.idNumber ? ageFromSaId(emp.idNumber) : null)) != null
                      ? ` · age ${emp.age ?? ageFromSaId(emp.idNumber)}`
                      : ''}
                    {emp.idNumber ? ` · ${emp.idNumber}` : ''}
                    {idOk === true && <span className="badge" style={{ marginLeft: 6 }}>ID OK</span>}
                    {idOk === false && <span className="badge bad" style={{ marginLeft: 6 }}>ID fail</span>}
                    {emp.taxNumber ? ` · Tax ${emp.taxNumber}` : ''}
                  </div>
                  {(emp.email || emp.phone) ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {[emp.email, emp.phone].filter(Boolean).join(' · ')}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openForm(emp)}>Edit</button>
                  <ActionMenu label="Actions" items={rowActions(emp)} />
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
