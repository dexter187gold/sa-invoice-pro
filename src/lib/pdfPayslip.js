import { downloadJsPdf, showInAppPdfViewer, revokeLater } from './pdfOpen'
import { loadJsPdf } from './loadJsPdf'
import { formatMoney } from './money'

const ZAR = (value) => formatMoney(Number(value) || 0)
const clean = (value) => String(value ?? '').trim() || '—'
const fmtDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
const monthName = (period) => {
  if (!/^\d{4}-\d{2}$/.test(String(period || ''))) return clean(period)
  return new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

/**
 * Generate a detailed South African employee payslip PDF.
 * Values are snapshots saved when payroll is run so historical slips do not
 * silently change when the employee profile is edited later.
 */
export async function generatePayslipPdf(payslip, company = {}, opts = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 14
  const right = pageW - margin
  const width = right - margin
  const green = [20, 83, 45]
  const muted = [93, 105, 99]
  const pale = [239, 247, 241]
  const emp = payslip.employee || {}
  const employer = payslip.employer || company || {}
  let y = margin

  const ensureSpace = (height = 12) => {
    if (y + height > 282) {
      doc.addPage()
      y = margin
    }
  }
  const line = (x1, yy, x2, color = [220, 228, 222]) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.25)
    doc.line(x1, yy, x2, yy)
  }
  const section = (title) => {
    ensureSpace(13)
    doc.setFillColor(...pale)
    doc.roundedRect(margin, y - 4.5, width, 8, 1.5, 1.5, 'F')
    doc.setTextColor(...green)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(title.toUpperCase(), margin + 2, y + 0.7)
    y += 8
    doc.setTextColor(25, 35, 29)
  }
  const pair = (label, value, x, yy, maxW = 82) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(String(label), x, yy)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 40, 34)
    const text = clean(value)
    const wrapped = doc.splitTextToSize(text, maxW)
    doc.text(wrapped, x, yy + 4)
    return Math.max(8, wrapped.length * 3.6 + 4)
  }
  const table = (headers, rows, opts = {}) => {
    const colWidths = opts.widths || headers.map(() => width / headers.length)
    const xs = [margin]
    colWidths.forEach((w) => xs.push(xs[xs.length - 1] + w))
    ensureSpace(14)
    doc.setFillColor(246, 248, 246)
    doc.rect(margin, y - 4, width, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.3)
    doc.setTextColor(...muted)
    headers.forEach((h, i) => doc.text(String(h), i === headers.length - 1 ? xs[i + 1] - 2 : xs[i] + 2, y, { align: i === headers.length - 1 ? 'right' : 'left' }))
    y += 5
    doc.setTextColor(30, 40, 34)
    for (const row of rows) {
      const label = String(row[0] ?? '')
      const descLines = doc.splitTextToSize(label, colWidths[0] - 5)
      const rowH = Math.max(6, descLines.length * 3.4 + 2)
      ensureSpace(rowH + 2)
      doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
      doc.setFontSize(8)
      doc.text(descLines, xs[0] + 2, y)
      for (let i = 1; i < headers.length; i++) {
        const value = row[i] == null || row[i] === '' ? '—' : String(row[i])
        doc.text(value, xs[i + 1] - 2, y, { align: 'right' })
      }
      y += rowH
      line(margin, y - 1, right)
    }
    y += 2
  }

  const companyName = employer.name || payslip.companyName || 'Employer'
  doc.setFillColor(...green)
  doc.roundedRect(margin, y - 4, width, 27, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(String(companyName), margin + 4, y + 3, { maxWidth: 130 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('EMPLOYEE PAYSLIP', right - 4, y + 2, { align: 'right' })
  doc.setFontSize(9)
  doc.text(monthName(payslip.period), right - 4, y + 8, { align: 'right' })
  doc.setFontSize(7)
  const employerLines = [
    employer.address || employer.physicalAddress || employer.businessAddress,
    [employer.email, employer.phone || employer.telephone].filter(Boolean).join(' · '),
    [employer.registrationNumber && `Reg: ${employer.registrationNumber}`, employer.vatNumber && `VAT: ${employer.vatNumber}`].filter(Boolean).join(' · '),
    [employer.payeReference && `PAYE: ${employer.payeReference}`, employer.uifReference && `UIF: ${employer.uifReference}`, employer.sdlReference && `SDL: ${employer.sdlReference}`].filter(Boolean).join(' · '),
  ].filter(Boolean)
  let ey = y + 9
  employerLines.forEach((s) => { doc.text(String(s), margin + 4, ey, { maxWidth: 118 }); ey += 4 })
  y += 31
  doc.setTextColor(30, 40, 34)

  section('Employment & payroll details')
  const leftX = margin + 2
  const rightX = margin + width / 2 + 2
  const detailRows = [
    [['Employee name', emp.name || payslip.employeeName], ['Employee / payroll no.', emp.employeeNumber || payslip.employeeNumber]],
    [['Occupation / job title', emp.occupation || emp.role || payslip.occupation], ['SA ID / passport', emp.idNumber || payslip.idNumber]],
    [['SARS tax reference', emp.taxNumber || payslip.taxNumber], ['Employment start date', fmtDate(emp.employmentStart || payslip.employmentStart)]],
    [['Employee address', emp.address || payslip.employeeAddress], ['Employee email', emp.email || payslip.employeeEmail]],
    [['Pay frequency', emp.payFrequency || payslip.payFrequency || 'Monthly'], ['Payment date', fmtDate(payslip.payDate)]],
    [['Pay period', payslip.periodStart && payslip.periodEnd ? `${fmtDate(payslip.periodStart)} – ${fmtDate(payslip.periodEnd)}` : monthName(payslip.period)], ['Payment method', payslip.paymentMethod || 'Not recorded']],
  ]
  for (const [l, r] of detailRows) {
    ensureSpace(11)
    const h1 = pair(l[0], l[1], leftX, y, width / 2 - 12)
    const h2 = pair(r[0], r[1], rightX, y, width / 2 - 12)
    y += Math.max(h1, h2)
  }
  y += 2

  section('Earnings')
  const earnings = [
    ['Basic salary / wages', ZAR(payslip.basicSalary ?? payslip.salary)],
    ['Travel allowance', ZAR(payslip.transportAllowance)],
    ['Other taxable allowance / earnings', ZAR(payslip.otherAllowance)],
  ]
  if (Number(payslip.overtime) !== 0) earnings.push(['Overtime pay', ZAR(payslip.overtime)])
  if (Number(payslip.sundayHolidayPay) !== 0) earnings.push(['Sunday / public holiday pay', ZAR(payslip.sundayHolidayPay)])
  if (Number(payslip.commission) !== 0) earnings.push(['Commission', ZAR(payslip.commission)])
  if (Number(payslip.bonus) !== 0) earnings.push(['Bonus / incentive', ZAR(payslip.bonus)])
  if (Number(payslip.otherEarnings) !== 0) earnings.push(['Other earnings', ZAR(payslip.otherEarnings)])
  earnings.push(['TOTAL CASH EARNINGS', ZAR(payslip.gross), ''])
  table(['Description', 'Amount (ZAR)'], earnings, { widths: [width - 42, 42] })

  section('Deductions')
  const deductions = [
    ['PAYE — employees’ tax (estimate)', ZAR(payslip.paye)],
    ['UIF — employee contribution', ZAR(payslip.uif)],
  ]
  if (Number(payslip.pensionEmployee) !== 0) deductions.push(['Pension / provident fund', ZAR(payslip.pensionEmployee)])
  if (Number(payslip.medicalAidEmployee) !== 0) deductions.push(['Medical aid employee contribution', ZAR(payslip.medicalAidEmployee)])
  if (Number(payslip.unionFees) !== 0) deductions.push(['Union / bargaining council fees', ZAR(payslip.unionFees)])
  if (Number(payslip.otherDeductions) !== 0) deductions.push(['Other authorised deductions', ZAR(payslip.otherDeductions)])
  deductions.push(['TOTAL DEDUCTIONS', ZAR(payslip.totalDeductions ?? ((Number(payslip.paye) || 0) + (Number(payslip.uif) || 0) + (Number(payslip.pensionEmployee) || 0) + (Number(payslip.medicalAidEmployee) || 0) + (Number(payslip.unionFees) || 0) + (Number(payslip.otherDeductions) || 0)))])
  table(['Description', 'Amount (ZAR)'], deductions, { widths: [width - 42, 42] })

  ensureSpace(25)
  doc.setFillColor(...green)
  doc.roundedRect(margin, y, width, 17, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('NET PAY / AMOUNT PAID', margin + 4, y + 6)
  doc.setFontSize(16)
  doc.text(ZAR(payslip.net), right - 4, y + 11, { align: 'right' })
  y += 23
  doc.setTextColor(30, 40, 34)

  section('Employer contributions & payroll information')
  table(['Item', 'Amount (ZAR)'], [
    ['UIF — employer contribution (not deducted from employee)', ZAR(payslip.uifEmployer)],
    ['SDL — Skills Development Levy (employer-only; where applicable)', ZAR(payslip.sdl)],
    ['ETI — Employment Tax Incentive (employer credit, informational)', ZAR(payslip.eti)],
    ['PAYE taxable remuneration (estimate basis)', ZAR(payslip.taxableRemuneration ?? payslip.gross)],
  ], { widths: [width - 42, 42] })

  section('Hours, rates & source-code summary')
  const hours = payslip.hours || {}
  table(['Measure', 'Value'], [
    ['Ordinary hours worked', clean(hours.ordinary)],
    ['Overtime hours worked', clean(hours.overtime)],
    ['Sunday hours worked', clean(hours.sunday)],
    ['Public holiday hours worked', clean(hours.publicHoliday)],
    ['Ordinary / overtime rate', clean(hours.rate)],
    ['SARS code 3601 — basic salary', ZAR(payslip.sourceCodes?.[3601] ?? payslip.sourceCodes?.['3601'] ?? payslip.basicSalary ?? payslip.salary)],
    ['SARS code 3701 — travel allowance', ZAR(payslip.sourceCodes?.[3701] ?? payslip.sourceCodes?.['3701'] ?? payslip.transportAllowance)],
    ['SARS code 4102 — PAYE', ZAR(payslip.sourceCodes?.[4102] ?? payslip.sourceCodes?.['4102'] ?? payslip.paye)],
  ], { widths: [width - 42, 42] })

  section('Year-to-date totals')
  const ytd = payslip.ytd || {}
  table(['Measure', 'Tax year to date (ZAR)'], [
    ['Gross cash earnings', ZAR(ytd.gross)],
    ['PAYE deducted', ZAR(ytd.paye)],
    ['UIF employee contributions', ZAR(ytd.uif)],
    ['Net pay', ZAR(ytd.net)],
  ], { widths: [width - 52, 52] })

  ensureSpace(22)
  y += 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...muted)
  const note = 'Important: This payslip records the payroll inputs saved by the employer. PAYE is an estimate based on SA tax year 2026/27 assumptions; allowance treatment, medical credits, retirement deductions, fringe benefits, ETI eligibility and statutory exceptions may require additional calculation. Verify figures against current SARS guidance and the applicable employment agreement / collective agreement. This PDF is not an EMP201/EMP501 submission or proof that statutory payments were remitted.'
  const noteLines = doc.splitTextToSize(note, width)
  doc.text(noteLines, margin, y)
  y += noteLines.length * 3.2 + 5
  doc.setFontSize(7)
  doc.text(`Generated ${new Date().toLocaleString('en-ZA')} · SA INVOICE PRO · Keep a copy with payroll records.`, margin, y, { maxWidth: width })

  const blob = doc.output('blob')
  const safeName = String(payslip.employeeName || emp.name || 'staff').trim().replace(/[^\w.-]+/g, '-')
  const filename = `payslip-${safeName}-${payslip.period || 'period'}.pdf`
  const url = URL.createObjectURL(blob)
  revokeLater(url)
  if (opts.download !== false) await downloadJsPdf(doc, filename)
  else if (opts.preview) showInAppPdfViewer(url, filename)
  return { blob, filename }
}
