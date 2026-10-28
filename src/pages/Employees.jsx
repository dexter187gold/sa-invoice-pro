import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { isValidSaId, ageFromSaId } from '../lib/saTaxEngine'
import {
  SearchInput, EmptyState, matchesQuery, ConfirmDialog, PageFade, StatCard, downloadCsv,
} from '../components/ui'

const empty = {
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
      employeeNumber: form.employeeNumber.trim(),
      salary: Number(form.salary) || 0,
      transportAllowance: Number(form.transportAllowance) || 0,
      otherAllowance: Number(form.otherAllowance) || 0,
      callOutAllowance: Number(form.callOutAllowance) || 0,
      overtime15: Number(form.overtime15) || 0,
      overtime20: Number(form.overtime20) || 0,
      standbyAllowance: Number(form.standbyAllowance) || 0,
      siteAllowance: Number(form.siteAllowance) || 0,
      sundayHolidayPay: Number(form.sundayHolidayPay) || 0,
      commission: Number(form.commission) || 0,
      bonus: Number(form.bonus) || 0,
      otherEarnings: Number(form.otherEarnings) || 0,
      pensionEmployee: Number(form.pensionEmployee) || 0,
      medicalAidEmployee: Number(form.medicalAidEmployee) || 0,
      unionFees: Number(form.unionFees) || 0,
      otherDeductions: Number(form.otherDeductions) || 0,
      hourlyRate: Number(form.hourlyRate) || 0,
      mibcoLevy: Number(form.mibcoLevy) || 0,
      mibcoEmployer: Number(form.mibcoEmployer) || 0,
      pensionEmployer: Number(form.pensionEmployer) || 0,
      pensionRiskEmployer: Number(form.pensionRiskEmployer) || 0,
      fringeBenefits: Number(form.fringeBenefits) || 0,
      taxDeductibleDeductions: Number(form.taxDeductibleDeductions) || 0,
      annualLeaveEntitlement: Number(form.annualLeaveEntitlement) || 0,
      annualLeaveOpening: Number(form.annualLeaveOpening) || 0,
      annualLeaveAccrued: Number(form.annualLeaveAccrued) || 0,
      annualLeaveClosing: Number(form.annualLeaveClosing) || 0,
      knownAs: form.knownAs.trim(),
      jobGrade: form.jobGrade.trim(),
      companyRule: form.companyRule.trim(),
      accountNumber: form.accountNumber.trim(),
      branchCode: form.branchCode.trim(),
      hoursPerPeriod: Number(form.hoursPerPeriod) || 0,
      uif: !!form.uif,
      etiMonth: Number(form.etiMonth) || 0,
      age: age ?? undefined,
    })
    setForm({ ...empty })
    setShow(false)
    await refresh()
    toast('Employee saved', 'success')
  }

  const exportCsv = () => {
    downloadCsv(`employees-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'ID number', 'Tax number', 'Role', 'Salary', 'Travel', 'Other allowance', 'UIF', 'ETI months', 'Email', 'Age'],
      filtered.map((e) => [
        e.name || '', e.idNumber || '', e.taxNumber || '', e.role || '',
        Number(e.salary) || 0, Number(e.transportAllowance) || 0, Number(e.otherAllowance) || 0,
        e.uif !== false ? 'yes' : 'no', Number(e.etiMonth) || 0, e.email || '',
        e.age ?? (e.idNumber ? ageFromSaId(e.idNumber) : '') ?? '',
      ])
    )
    toast('CSV exported', 'success')
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
          <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
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
            <label className="label">Employee / payroll number</label>
            <input className="input" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} placeholder="e.g. EMP-001" />
          </div>
          <div>
            <label className="label">Known as / preferred name</label>
            <input className="input" value={form.knownAs} onChange={(e) => setForm({ ...form, knownAs: e.target.value })} placeholder="Preferred name" />
          </div>
          <div>
            <label className="label">Job grade / band</label>
            <input className="input" value={form.jobGrade} onChange={(e) => setForm({ ...form, jobGrade: e.target.value })} placeholder="e.g. Band 1" />
          </div>
          <div>
            <label className="label">Company rule / bargaining agreement</label>
            <input className="input" value={form.companyRule} onChange={(e) => setForm({ ...form, companyRule: e.target.value })} placeholder="Applicable company rule" />
          </div>
          <div>
            <label className="label">Bank account number</label>
            <input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account number" autoComplete="off" />
          </div>
          <div>
            <label className="label">Bank branch code</label>
            <input className="input" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} placeholder="6-digit branch code" />
          </div>
          <div>
            <label className="label">Hours per pay period</label>
            <input className="input" type="number" min="0" step="0.25" value={form.hoursPerPeriod} onChange={(e) => setForm({ ...form, hoursPerPeriod: e.target.value })} />
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
            <label className="label">Call-out allowance (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.callOutAllowance} onChange={(e) => setForm({ ...form, callOutAllowance: e.target.value })} />
          </div>
          <div>
            <label className="label">Overtime @ 1.5 (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.overtime15} onChange={(e) => setForm({ ...form, overtime15: e.target.value })} />
          </div>
          <div>
            <label className="label">Overtime @ 2.0 (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.overtime20} onChange={(e) => setForm({ ...form, overtime20: e.target.value })} />
          </div>
          <div>
            <label className="label">Standby allowance (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.standbyAllowance} onChange={(e) => setForm({ ...form, standbyAllowance: e.target.value })} />
          </div>
          <div>
            <label className="label">Site allowance (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.siteAllowance} onChange={(e) => setForm({ ...form, siteAllowance: e.target.value })} />
          </div>
          <div>
            <label className="label">Sunday / public holiday pay (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.sundayHolidayPay} onChange={(e) => setForm({ ...form, sundayHolidayPay: e.target.value })} />
          </div>
          <div>
            <label className="label">Commission (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
          </div>
          <div>
            <label className="label">Bonus / incentive (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
          </div>
          <div>
            <label className="label">Other earnings (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.otherEarnings} onChange={(e) => setForm({ ...form, otherEarnings: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Residential address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Employee address" />
          </div>
          <div>
            <label className="label">Employment start date</label>
            <input className="input" type="date" value={form.employmentStart} onChange={(e) => setForm({ ...form, employmentStart: e.target.value })} />
          </div>
          <div>
            <label className="label">Pay frequency</label>
            <select className="input" value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value })}>
              <option>Monthly</option><option>Fortnightly</option><option>Weekly</option><option>Hourly</option>
            </select>
          </div>
          <div>
            <label className="label">Payment method</label>
            <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option>EFT</option><option>Cash</option><option>Cheque</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="label">Ordinary hours worked (period)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.ordinaryHoursWorked} onChange={(e) => setForm({ ...form, ordinaryHoursWorked: e.target.value })} />
          </div>
          <div>
            <label className="label">Overtime hours worked (period)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.overtimeHoursWorked} onChange={(e) => setForm({ ...form, overtimeHoursWorked: e.target.value })} />
          </div>
          <div>
            <label className="label">Sunday hours worked (period)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.sundayHoursWorked} onChange={(e) => setForm({ ...form, sundayHoursWorked: e.target.value })} />
          </div>
          <div>
            <label className="label">Public holiday hours worked (period)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.publicHolidayHoursWorked} onChange={(e) => setForm({ ...form, publicHolidayHoursWorked: e.target.value })} />
          </div>
          <div>
            <label className="label">Hourly pay rate (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
          </div>
          <div>
            <label className="label">Pension / provident deduction (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.pensionEmployee} onChange={(e) => setForm({ ...form, pensionEmployee: e.target.value })} />
          </div>
          <div>
            <label className="label">Medical aid employee contribution (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.medicalAidEmployee} onChange={(e) => setForm({ ...form, medicalAidEmployee: e.target.value })} />
          </div>
          <div>
            <label className="label">Union / bargaining council fees (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.unionFees} onChange={(e) => setForm({ ...form, unionFees: e.target.value })} />
          </div>
          <div>
            <label className="label">Other authorised deductions (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.otherDeductions} onChange={(e) => setForm({ ...form, otherDeductions: e.target.value })} />
          </div>
          <div>
            <label className="label">MIBCO / bargaining council employee levy (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.mibcoLevy} onChange={(e) => setForm({ ...form, mibcoLevy: e.target.value })} />
          </div>
          <div>
            <label className="label">MIBCO / bargaining council employer contribution (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.mibcoEmployer} onChange={(e) => setForm({ ...form, mibcoEmployer: e.target.value })} />
          </div>
          <div>
            <label className="label">Employer pension / provident contribution (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.pensionEmployer} onChange={(e) => setForm({ ...form, pensionEmployer: e.target.value })} />
          </div>
          <div>
            <label className="label">Employer provident risk contribution (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.pensionRiskEmployer} onChange={(e) => setForm({ ...form, pensionRiskEmployer: e.target.value })} />
          </div>
          <div>
            <label className="label">Monthly fringe benefits (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.fringeBenefits} onChange={(e) => setForm({ ...form, fringeBenefits: e.target.value })} />
          </div>
          <div>
            <label className="label">Tax-deductible deductions (YTD opening / payroll input) (ZAR)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.taxDeductibleDeductions} onChange={(e) => setForm({ ...form, taxDeductibleDeductions: e.target.value })} />
          </div>
          <div>
            <label className="label">Annual leave entitlement (days)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.annualLeaveEntitlement} onChange={(e) => setForm({ ...form, annualLeaveEntitlement: e.target.value })} />
          </div>
          <div>
            <label className="label">Annual leave balance brought forward (days)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.annualLeaveOpening} onChange={(e) => setForm({ ...form, annualLeaveOpening: e.target.value })} />
          </div>
          <div>
            <label className="label">Annual leave accrued this period (days)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.annualLeaveAccrued} onChange={(e) => setForm({ ...form, annualLeaveAccrued: e.target.value })} />
          </div>
          <div>
            <label className="label">Annual leave balance carried forward (days)</label>
            <input className="input" type="number" min="0" step="0.25" value={form.annualLeaveClosing} onChange={(e) => setForm({ ...form, annualLeaveClosing: e.target.value })} />
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
                    {(emp.age ?? (emp.idNumber ? ageFromSaId(emp.idNumber) : null)) != null
                      ? ` · age ${emp.age ?? ageFromSaId(emp.idNumber)}`
                      : ''}
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
