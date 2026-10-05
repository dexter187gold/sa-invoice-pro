import { loadJsPdf } from './loadJsPdf'
import { formatMoney } from './money'

/**
 * Generate a simple SA-style payslip PDF for one payslip record.
 */
export async function generatePayslipPdf(payslip, company = {}, opts = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  let y = margin

  const companyName = company.name || payslip.companyName || 'Employer'
  const period = payslip.period || ''

  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(companyName, margin, y)
  y += 7
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text('Payslip (estimate)', margin, y)
  y += 6
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${period}`, margin, y)
  y += 5
  doc.text(`Employee: ${payslip.employeeName || '—'}`, margin, y)
  y += 8
  doc.setTextColor(0)

  doc.setDrawColor(0, 122, 77)
  doc.setLineWidth(0.4)
  doc.line(margin, y, 210 - margin, y)
  y += 8

  const rows = [
    ['Gross earnings', formatMoney(payslip.gross)],
    ['PAYE (est.)', formatMoney(payslip.paye)],
    ['UIF employee', formatMoney(payslip.uif)],
    ['Net pay', formatMoney(payslip.net)],
  ]
  if (payslip.eti != null) rows.push(['ETI credit (info)', formatMoney(payslip.eti)])
  if (payslip.sdl != null) rows.push(['SDL employer (info)', formatMoney(payslip.sdl)])

  doc.setFontSize(10)
  for (const [label, val] of rows) {
    doc.text(label, margin, y)
    doc.text(String(val), 210 - margin, y, { align: 'right' })
    y += 7
  }

  y += 6
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(
    'Statutory figures are client-side estimates for tax year 2026/27. Not a substitute for SARS e@syFile or a registered practitioner.',
    margin,
    y,
    { maxWidth: 178 }
  )
  y += 12
  doc.text(`Generated ${new Date().toLocaleString('en-ZA')} · SA Invoice Pro`, margin, y)

  const blob = doc.output('blob')
  const filename = `payslip-${(payslip.employeeName || 'staff').replace(/\s+/g, '-')}-${period}.pdf`

  if (opts.download !== false) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  if (opts.preview) {
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (!w) {
      // popup blocked — already downloaded
    }
  }

  return { blob, filename }
}
