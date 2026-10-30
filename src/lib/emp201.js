/**
 * EMP201 helper export (P3) — PAYE / UIF / SDL summary for a tax month.
 * Not a SARS eFiling submission; produces a review CSV + totals for the owner.
 */

function monthKey(period) {
  // period: YYYY-MM
  return String(period || '').slice(0, 7)
}

export function aggregateEmp201(payslips = [], period) {
  const key = monthKey(period)
  const rows = (payslips || []).filter((p) => monthKey(p.period || p.payPeriod) === key)
  const employees = new Map()
  let paye = 0
  let uifEmployee = 0
  let uifEmployer = 0
  let sdl = 0
  let gross = 0

  for (const p of rows) {
    const g = Number(p.gross ?? p.grossPay ?? 0) || 0
    const payeAmt = Number(p.paye ?? p.tax ?? p.payeTax ?? 0) || 0
    const uifEe = Number(p.uifEmployee ?? p.uif ?? 0) || 0
    const uifEr = Number(p.uifEmployer ?? p.uifEr ?? uifEe) || 0
    const sdlAmt = Number(p.sdl ?? 0) || 0
    gross += g
    paye += payeAmt
    uifEmployee += uifEe
    uifEmployer += uifEr
    sdl += sdlAmt
    const id = p.employeeId || p.idNumber || p.name
    if (!employees.has(id)) {
      employees.set(id, {
        employeeId: p.employeeId,
        name: p.employeeName || p.name || '',
        idNumber: p.idNumber || '',
        gross: 0,
        paye: 0,
        uifEmployee: 0,
        uifEmployer: 0,
        sdl: 0,
      })
    }
    const e = employees.get(id)
    e.gross += g
    e.paye += payeAmt
    e.uifEmployee += uifEe
    e.uifEmployer += uifEr
    e.sdl += sdlAmt
  }

  const totalUif = Math.round((uifEmployee + uifEmployer) * 100) / 100
  const totalLiability = Math.round((paye + totalUif + sdl) * 100) / 100

  return {
    period: key,
    employeeCount: employees.size,
    payslipCount: rows.length,
    gross: Math.round(gross * 100) / 100,
    paye: Math.round(paye * 100) / 100,
    uifEmployee: Math.round(uifEmployee * 100) / 100,
    uifEmployer: Math.round(uifEmployer * 100) / 100,
    uifTotal: totalUif,
    sdl: Math.round(sdl * 100) / 100,
    totalLiability,
    employees: [...employees.values()],
  }
}

export function emp201ToCsv(summary) {
  const lines = [
    ['EMP201 review export — not an official SARS form'],
    ['Period', summary.period],
    ['Employees', summary.employeeCount],
    ['Payslips', summary.payslipCount],
    ['Gross', summary.gross],
    ['PAYE', summary.paye],
    ['UIF employee', summary.uifEmployee],
    ['UIF employer', summary.uifEmployer],
    ['UIF total', summary.uifTotal],
    ['SDL', summary.sdl],
    ['Total liability', summary.totalLiability],
    [],
    ['Employee', 'ID number', 'Gross', 'PAYE', 'UIF ee', 'UIF er', 'SDL'],
  ]
  for (const e of summary.employees || []) {
    lines.push([
      e.name,
      e.idNumber,
      e.gross,
      e.paye,
      e.uifEmployee,
      e.uifEmployer,
      e.sdl,
    ])
  }
  return lines.map((row) => row.map((c) => {
    const s = String(c ?? '')
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
}

export function downloadEmp201Csv(payslips, period, filename) {
  const summary = aggregateEmp201(payslips, period)
  const csv = emp201ToCsv(summary)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `EMP201-review-${summary.period || 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return summary
}
