import React, { useMemo, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import {
  processProudlySaPayrollRun,
  toCents,
  fromCents,
  isValidSaId,
  ageFromSaId,
} from '../lib/saTaxEngine'
import { generatePayslipPdf } from '../lib/pdfPayslip'
import { ConfirmDialog, LoadingButton, StatCard } from '../components/ui'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Payroll() {
  const { employees, company, refresh, toast } = useApp()
  const [payslips, setPayslips] = useState([])
  const [period, setPeriod] = useState(currentPeriod())
  const [selected, setSelected] = useState({})
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(null)

  const loadPayslips = async () => {
    const all = (await db.getAll(STORES.payslips)) || []
    all.sort((a, b) => String(b.period).localeCompare(String(a.period)) || String(b.createdAt).localeCompare(String(a.createdAt)))
    setPayslips(all)
  }

  useEffect(() => {
    loadPayslips()
  }, [])

  useEffect(() => {
    const map = {}
    for (const e of employees) map[e.id] = true
    setSelected(map)
  }, [employees])

  const periodPayslips = useMemo(
    () => payslips.filter((p) => p.period === period),
    [payslips, period]
  )

  const alreadyRunIds = useMemo(() => new Set(periodPayslips.map((p) => p.employeeId)), [periodPayslips])

  const calcForEmployee = (emp) => {
    const age =
      emp.age != null
        ? Number(emp.age)
        : ageFromSaId(emp.idNumber) ?? 30
    return processProudlySaPayrollRun({
      baseSalaryCents: toCents(emp.salary),
      transportAllowanceCents: toCents(emp.transportAllowance || 0),
      otherTaxableCents: toCents(emp.otherAllowance || 0),
      uifApplicable: emp.uif !== false,
      age,
      etiMonth: Number(emp.etiMonth) || 0,
    })
  }

  const runPayroll = async () => {
    if (!employees.length) return toast('Add employees first', 'error')
    const ids = Object.keys(selected).filter((id) => selected[id])
    if (!ids.length) return toast('Select at least one employee', 'error')

    setBusy(true)
    try {
      let created = 0
      for (const emp of employees) {
        if (!selected[emp.id]) continue
        if (alreadyRunIds.has(emp.id)) continue

        const calc = calcForEmployee(emp)
        await db.add(STORES.payslips, {
          employeeId: emp.id,
          employeeName: emp.name,
          period,
          companyName: company?.name || '',
          salary: Number(emp.salary) || 0,
          gross: calc.grossR,
          paye: calc.payeR,
          uif: calc.uifR,
          net: calc.netR,
          eti: calc.etiR,
          sdl: calc.sdlR,
          uifEmployer: fromCents(calc.uifEmployerCents),
          sourceCodes: {
            3601: fromCents(calc.sarsSourceCode3601),
            3701: fromCents(calc.sarsSourceCode3701),
            4102: fromCents(calc.sarsSourceCode4102),
            4118: fromCents(calc.sarsSourceCode4118),
          },
          idValid: emp.idNumber ? isValidSaId(emp.idNumber) : null,
        })
        created++
      }
      await loadPayslips()
      await refresh()
      if (created === 0) toast('No new payslips (already run for selected employees this period)', 'info')
      else toast(`Payroll run complete — ${created} payslip(s) created`, 'success')
    } catch (e) {
      console.error(e)
      toast('Payroll failed: ' + (e.message || e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const delPayslip = (id) => {
    setConfirm({
      title: 'Delete this payslip?',
      message: 'The payslip record will be removed from history.',
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        await db.remove(STORES.payslips, id)
        await loadPayslips()
        toast('Payslip deleted', 'success')
        setConfirm(null)
      },
    })
  }

  const downloadPdf = async (p) => {
    setPdfBusy(p.id)
    try {
      await generatePayslipPdf(p, company, { download: true, preview: true })
      toast('Payslip PDF ready', 'success')
    } catch (e) {
      console.error(e)
      toast('PDF failed: ' + (e.message || e), 'error')
    } finally {
      setPdfBusy(null)
    }
  }

  const exportCsv = () => {
    const rows = periodPayslips.length ? periodPayslips : payslips
    const lines = [
      'Period,Employee,Gross,PAYE,UIF,Net,ETI,SDL_Employer',
    ]
    for (const p of rows) {
      lines.push(
        [
          p.period,
          JSON.stringify(p.employeeName || ''),
          p.gross,
          p.paye,
          p.uif,
          p.net,
          p.eti,
          p.sdl,
        ].join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `payroll-${period || 'all'}.csv`
    a.click()
  }

  const totals = periodPayslips.reduce(
    (acc, p) => {
      acc.gross += Number(p.gross) || 0
      acc.paye += Number(p.paye) || 0
      acc.uif += Number(p.uif) || 0
      acc.net += Number(p.net) || 0
      acc.eti += Number(p.eti) || 0
      acc.sdl += Number(p.sdl) || 0
      return acc
    },
    { gross: 0, paye: 0, uif: 0, net: 0, eti: 0, sdl: 0 }
  )

  const toggleAll = (on) => {
    const map = {}
    for (const e of employees) map[e.id] = on
    setSelected(map)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <p className="subtitle">
            SA statutory estimates (PAYE · UIF · SDL · ETI skeleton) · tax year 2026/27 · not e@syFile
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>
            Export CSV
          </button>
          <LoadingButton loading={busy} disabled={!employees.length} onClick={runPayroll}>
            Run payroll for period
          </LoadingButton>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-grid cols-3" style={{ alignItems: 'end' }}>
          <div>
            <label className="label">Pay period (YYYY-MM)</label>
            <input
              className="input"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Employees selected</label>
            <div className="muted" style={{ paddingTop: 6 }}>
              {Object.values(selected).filter(Boolean).length} / {employees.length}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleAll(true)}>
              Select all
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleAll(false)}>
              Clear
            </button>
          </div>
        </div>
        <p className="muted" style={{ margin: '.75rem 0 0', fontSize: 13 }}>
          Calculations use cents internally, 2026/27 SARS brackets + primary rebate, UIF 1% capped at
          R17 712/mo, SDL 1% employer. Medical credits, directives, and full ETI rules are not applied.
          Always verify with a tax practitioner before SARS submission.
        </p>
      </div>

      {periodPayslips.length > 0 && (
        <div className="grid-stats" style={{ marginBottom: '1rem' }}>
          <StatCard label="Gross (period)" value={formatMoney(totals.gross)} />
          <StatCard label="PAYE est." value={formatMoney(totals.paye)} tone="warn" />
          <StatCard label="UIF (emp)" value={formatMoney(totals.uif)} />
          <StatCard label="Net pay" value={formatMoney(totals.net)} tone="good" />
        </div>
      )}

      <h3 style={{ margin: '0 0 .75rem' }}>Employees</h3>
      {!employees.length && <div className="card empty">No employees — add them under Employees first.</div>}

      {employees.map((emp) => {
        const calc = calcForEmployee(emp)
        const ran = alreadyRunIds.has(emp.id)
        const idOk = emp.idNumber ? isValidSaId(emp.idNumber) : null
        return (
          <div key={emp.id} className="list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={!!selected[emp.id]}
                  onChange={(e) => setSelected({ ...selected, [emp.id]: e.target.checked })}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <strong>{emp.name}</strong>
                  {ran && <span className="badge" style={{ marginLeft: 8 }}>Paid this period</span>}
                  <div className="muted" style={{ fontSize: 13 }}>
                    {emp.role || 'Staff'} · Salary {formatMoney(emp.salary)}/mo
                    {emp.uif !== false ? ' · UIF' : ''}
                    {idOk === false && <span className="badge bad" style={{ marginLeft: 6 }}>ID checksum fail</span>}
                    {idOk === true && <span className="badge" style={{ marginLeft: 6 }}>ID OK</span>}
                  </div>
                </div>
              </label>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div>Gross est. <strong>{formatMoney(calc.grossR)}</strong></div>
                <div className="muted">
                  PAYE {formatMoney(calc.payeR)} · UIF {formatMoney(calc.uifR)} · Net{' '}
                  <strong>{formatMoney(calc.netR)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 6 }}
                  onClick={() => setPreview({ emp, calc })}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <h3 style={{ margin: '1.5rem 0 .75rem' }}>Payslips — {period}</h3>
      {periodPayslips.map((p) => (
        <div key={p.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong>{p.employeeName}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              Gross {formatMoney(p.gross)} · PAYE {formatMoney(p.paye)} · UIF {formatMoney(p.uif)} · Net{' '}
              <strong>{formatMoney(p.net)}</strong>
            </div>
          </div>
          <div className="list-card-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pdfBusy === p.id}
              onClick={() => downloadPdf(p)}
            >
              {pdfBusy === p.id ? 'PDF…' : 'PDF'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => delPayslip(p.id)}>
              Del
            </button>
          </div>
        </div>
      ))}
      {!periodPayslips.length && <div className="card empty">No payslips for this period yet.</div>}

      {preview && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 80 }}
          onClick={() => setPreview(null)}
        >
          <div
            className="modal-card"
            style={{ width: 'min(420px, 94vw)', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Payslip preview</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {preview.emp.name} · {period}
            </p>
            <table className="table">
              <tbody>
                <tr><td>Basic salary (3601)</td><td style={{ textAlign: 'right' }}>{formatMoney(fromCents(preview.calc.sarsSourceCode3601))}</td></tr>
                <tr><td>Travel / other</td><td style={{ textAlign: 'right' }}>{formatMoney(fromCents(preview.calc.sarsSourceCode3701))}</td></tr>
                <tr><td>Taxable for PAYE</td><td style={{ textAlign: 'right' }}>{formatMoney(preview.calc.grossR)}</td></tr>
                <tr><td>PAYE (4102)</td><td style={{ textAlign: 'right' }}>{formatMoney(preview.calc.payeR)}</td></tr>
                <tr><td>UIF employee</td><td style={{ textAlign: 'right' }}>{formatMoney(preview.calc.uifR)}</td></tr>
                <tr><td>UIF employer</td><td style={{ textAlign: 'right' }}>{formatMoney(fromCents(preview.calc.uifEmployerCents))}</td></tr>
                <tr><td>SDL employer (info)</td><td style={{ textAlign: 'right' }}>{formatMoney(preview.calc.sdlR)}</td></tr>
                <tr><td>ETI credit (4118, skeleton)</td><td style={{ textAlign: 'right' }}>{formatMoney(preview.calc.etiR)}</td></tr>
                <tr>
                  <td><strong>Net pay</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{formatMoney(preview.calc.netR)}</strong></td>
                </tr>
              </tbody>
            </table>
            <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => setPreview(null)}>
              Close
            </button>
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
    </div>
  )
}
