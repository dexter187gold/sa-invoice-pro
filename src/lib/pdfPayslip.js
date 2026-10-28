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


async function generatePayslipAlternative(payslip, company = {}, opts = {}) {
  const jsPDF = await loadJsPdf()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const layout = opts.layout === 'example' ? 'example' : 'simplified'
  const margin = 10, right = 200, width = 180
  const emp = payslip.employee || {}
  const employer = payslip.employer || company || {}
  const money = (v) => ZAR(Number(v) || 0)
  const cleanVal = (v) => String(v ?? '').trim() || '—'
  const dateVal = (v) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-ZA')
  }
  const earnings = [
    ['Cash Salary', payslip.basicSalary ?? payslip.salary, payslip.hours?.ordinary],
    ['Travel Allowance', payslip.transportAllowance], ['Other Taxable Allowance', payslip.otherAllowance],
    ['Call Out Allowance', payslip.callOutAllowance],
    ['Overtime @ 1.5', payslip.overtime15], ['Overtime @ 2.0', payslip.overtime20],
    ['Overtime', payslip.overtime], ['Sunday / Public Holiday Pay', payslip.sundayHolidayPay],
    ['Standby Allowance', payslip.standbyAllowance], ['Site Allowance', payslip.siteAllowance],
    ['Commission', payslip.commission], ['Bonus / Incentive', payslip.bonus], ['Other Earnings', payslip.otherEarnings],
  ].filter((r) => r[1] != null && (Number(r[1]) !== 0 || r[0] === 'Cash Salary'))
  const gross = Number(payslip.gross ?? earnings.reduce((s, r) => s + (Number(r[1]) || 0), 0)) || 0
  const deductions = [
    ['Pay As You Earn (PAYE)', payslip.paye], ['Unemployment Insurance Fund (UIF)', payslip.uif],
    ['Mibco / Bargaining Council Levy', payslip.mibcoLevy], ['Pension / Provident Fund', payslip.pensionEmployee],
    ['Medical Aid', payslip.medicalAidEmployee], ['Union Fees', payslip.unionFees], ['Other Authorised Deductions', payslip.otherDeductions],
  ].filter((r) => Number(r[1]) !== 0 || /PAYE|UIF/.test(r[0]))
  const deductionTotal = Number(payslip.totalDeductions ?? deductions.reduce((s, r) => s + (Number(r[1]) || 0), 0)) || 0
  const contrib = [
    ['Skills Development Levy (SDL)', payslip.sdl], ['Unemployment Insurance Fund', payslip.uifEmployer],
    ['Mibco / Bargaining Council Levy', payslip.mibcoEmployer], ['Provident Fund', payslip.pensionEmployer],
    ['Provident Fund Risk', payslip.pensionRiskEmployer],
  ].filter((r) => Number(r[1]) !== 0)
  const ytd = payslip.ytd || {}
  let y = margin
  const green = [20, 83, 45], pale = [239, 247, 241], muted = [92, 102, 96]
  const ensure = (h = 8) => { if (y + h > 282) { doc.addPage(); y = margin } }
  const rule = (x1, yy, x2) => { doc.setDrawColor(205,215,208); doc.setLineWidth(.22); doc.line(x1,yy,x2,yy) }
  const section = (title, x = margin, w = width) => {
    ensure(9); doc.setFillColor(...pale); doc.rect(x,y,w,6,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...green)
    doc.text(title.toUpperCase(),x+1.5,y+4.1); y += 8; doc.setTextColor(25,35,29)
  }
  const drawTable = (headers, rows, x, yy, w, widths, rowHeight = 5.2, fs = 6.5) => {
    let ty = yy
    doc.setFillColor(245,247,245); doc.rect(x,ty-3.1,w,5,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(fs); doc.setTextColor(...muted)
    let xx=x
    headers.forEach((h,i) => { const align = i > 0 ? 'right' : 'left'; doc.text(String(h),align==='right'?xx+widths[i]-1:xx+1,ty,{align}); xx+=widths[i] })
    ty+=4
    for (const row of rows) {
      const lines=doc.splitTextToSize(String(row[0] ?? ''),widths[0]-2)
      const rh=Math.max(rowHeight,lines.length*2.8+1.5)
      if (ty+rh>281) { doc.addPage(); ty=margin+4 }
      doc.setFont('helvetica',row.bold?'bold':'normal'); doc.setFontSize(fs); doc.setTextColor(30,40,34)
      doc.text(lines,x+1,ty)
      let cx=x+widths[0]
      for(let i=1;i<headers.length;i++){doc.text(row[i]==null||row[i]===''?'—':String(row[i]),cx+widths[i]-1,ty,{align:'right'});cx+=widths[i]}
      ty+=rh; rule(x,ty-1,x+w)
    }
    return ty+1
  }
  if (layout === 'example') {
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...green)
    doc.text(String(employer.name || payslip.companyName || 'Company Name'),margin,y+2)
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...muted)
    doc.text(cleanVal(employer.address || employer.physicalAddress || employer.businessAddress),margin,y+6)
    doc.text('PAYE Ref: '+cleanVal(employer.payeReference)+'   UIF Reg: '+cleanVal(employer.uifReference)+'   SDL Ref: '+cleanVal(employer.sdlReference),margin,y+9)
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...green); doc.text('EMPLOYEE PAYSLIP',right,y+2,{align:'right'})
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...muted)
    doc.text('Pay Period: '+cleanVal(payslip.period)+'   Pay Date: '+dateVal(payslip.payDate),right,y+7,{align:'right'})
    y+=14; rule(margin,y,right); y+=4; section('Employee and company information')
    const left=[['Emp. Code',emp.employeeNumber||payslip.employeeNumber],['Emp. Name',emp.name||payslip.employeeName],['Known As',emp.knownAs],['ID Number',emp.idNumber||payslip.idNumber],['Emp. Address',emp.address||payslip.employeeAddress],['Income Tax No.',emp.taxNumber||payslip.taxNumber],['Date Engaged',dateVal(emp.employmentStart||payslip.employmentStart)],['Job Title',emp.occupation||emp.role||payslip.occupation],['Job Grade',emp.jobGrade],['Hours Per Period',emp.hoursPerPeriod||emp.ordinaryHoursWorked],['Account No.',emp.accountNumber||payslip.accountNumber],['Branch Code',emp.branchCode||payslip.branchCode]]
    const rightInfo=[['Pay Period',payslip.period],['Co. Name',employer.name||payslip.companyName],['Co. Address',employer.address||employer.physicalAddress||employer.businessAddress],['Company Rule',emp.companyRule||employer.companyRule],['PAYE Ref. No.',employer.payeReference],['UIF Reg. No.',employer.uifReference],['Rate Per Hour',emp.hourlyRate?'R '+emp.hourlyRate:payslip.hours?.rate],['Account No.',emp.accountNumber||payslip.accountNumber],['Payment Type',emp.paymentMethod||payslip.paymentMethod],['Employee Email',emp.email||payslip.employeeEmail],['Company Registration',employer.registrationNumber],['SDL Ref. No.',employer.sdlReference]]
    const half=(width-4)/2
    for(let i=0;i<left.length;i++){
      ensure(7); const a=left[i],b=rightInfo[i]
      doc.setFontSize(6.2);doc.setFont('helvetica','bold');doc.setTextColor(...muted);doc.text(a[0],margin+1,y)
      doc.setFont('helvetica','normal');doc.setTextColor(30,40,34);doc.text(doc.splitTextToSize(cleanVal(a[1]),half-24),margin+23,y)
      doc.setFont('helvetica','bold');doc.setTextColor(...muted);doc.text(b[0],margin+half+4,y)
      doc.setFont('helvetica','normal');doc.setTextColor(30,40,34);doc.text(doc.splitTextToSize(cleanVal(b[1]),half-26),margin+half+28,y);y+=5.1
    }
    y+=2; section('Earnings',margin,half); const top=y-8
    const erows=earnings.map(r=>[r[0],r[2]==null?'':String(r[2]),money(r[1]),'0.00']);erows.push(['Total Earnings','',money(gross),''])
    const eEnd=drawTable(['Description','Units','Amount','Open'],erows,margin,y,half,[half-40,10,21,9],5,5.8)
    section('Deductions',margin+half+4,half)
    const drows=deductions.map(r=>[r[0],'',money(r[1]),'0.00']);drows.push(['Total Deductions','',money(deductionTotal),''])
    const dEnd=drawTable(['Description','Units','Amount','Open'],drows,margin+half+4,top+8,half,[half-40,10,21,9],5,5.8)
    y=Math.max(eEnd,dEnd)+3;ensure(16)
    doc.setFillColor(...green);doc.roundedRect(margin,y,width,10,1,1,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255)
    doc.text('NET PAYOUT:',margin+3,y+6.5);doc.setFontSize(12);doc.text(money(payslip.net),right-3,y+6.5,{align:'right'});y+=14
    const half2=(width-4)/2;section('Company contributions',margin,half2)
    const crows=contrib.map(r=>[r[0],'',money(r[1]),'0.00']);crows.push(['Total Company Contributions','',money(payslip.companyContributionsTotal??contrib.reduce((s,r)=>s+(Number(r[1])||0),0)),''])
    const cEnd=drawTable(['Description','Units','Amount','Open'],crows,margin,y,half2,[half2-40,10,21,9],5,5.5)
    section('Year To Date Totals',margin+half2+4,half2)
    const yEnd=drawTable(['Description','Amount'],[['Tax Paid',money(ytd.paye)],['Taxable Earnings',money(ytd.taxable??payslip.taxableRemuneration)],['Fringe Benefits',money(ytd.fringeBenefits)],['Tax Deductible Deductions',money(ytd.taxDeductibleDeductions)]],margin+half2+4,y,[half2-23,23].reduce((a,b)=>a+b,0),[half2-23,23],5.5,5.7)
    y=Math.max(cEnd,yEnd)+3;section('Leave balances')
    let leaveRows=(payslip.leaveBalances||emp.leaveBalances||[]).map(l=>[l.description||l.name||'Leave',cleanVal(l.entitlement),cleanVal(l.balanceBfwd??l.openingBalance),cleanVal(l.accrued),cleanVal(l.balanceCfwd??l.closingBalance??l.balance)])
    if(!leaveRows.length) leaveRows=[['No leave balances recorded','—','—','—','—']]
    y=drawTable(['Description','Entitlement','Balance B/Fwd','Accrued','Balance C/Fwd'],leaveRows,margin,y,width,[width-83,20,25,18,20],5.5,5.7)
    doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(...muted);doc.text('PAYE values are estimates where indicated. Verify payroll figures before issuing.',margin,Math.min(y+3,288),{maxWidth:width})
  } else {
    doc.setFillColor(...green);doc.roundedRect(margin,y,width,25,2,2,'F')
    doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(255,255,255);doc.text(String(employer.name||payslip.companyName||'Company Name'),margin+4,y+7,{maxWidth:120})
    doc.setFontSize(8);doc.text('PAYSLIP',right-4,y+7,{align:'right'})
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(cleanVal(payslip.period)+' · Pay date '+dateVal(payslip.payDate),margin+4,y+14)
    doc.text(cleanVal(employer.address||employer.physicalAddress||employer.businessAddress),margin+4,y+19,{maxWidth:width-10});y+=31
    section('Employee')
    const pairs=[[['Name',emp.name||payslip.employeeName],['Employee no.',emp.employeeNumber||payslip.employeeNumber]],[['Role',emp.occupation||emp.role||payslip.occupation],['ID / passport',emp.idNumber||payslip.idNumber]],[['Tax reference',emp.taxNumber||payslip.taxNumber],['Pay period',payslip.period]]]
    for(const pair of pairs){const xx=margin+2,rx=margin+width/2+2;doc.setFontSize(6.5);doc.setTextColor(...muted);doc.setFont('helvetica','normal');doc.text(pair[0][0]+': '+cleanVal(pair[0][1]),xx,y);doc.text(pair[1][0]+': '+cleanVal(pair[1][1]),rx,y);y+=6}
    section('Earnings');let rows=earnings.map(r=>[r[0],money(r[1])]);rows.push(['Total earnings',money(gross),true]);y=drawTable(['Description','Amount (ZAR)'],rows,margin,y,width,[width-40,40],5.6,7)
    section('Deductions');rows=deductions.map(r=>[r[0],money(r[1])]);rows.push(['Total deductions',money(deductionTotal),true]);y=drawTable(['Description','Amount (ZAR)'],rows,margin,y,width,[width-40,40],5.6,7)
    ensure(17);doc.setFillColor(...green);doc.roundedRect(margin,y,width,13,1.5,1.5,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text('NET PAY',margin+3,y+8);doc.setFontSize(13);doc.text(money(payslip.net),right-3,y+8,{align:'right'});y+=18
    section('Year-to-date');y=drawTable(['Measure','Tax year to date'],[['Gross earnings',money(ytd.gross)],['PAYE deducted',money(ytd.paye)],['UIF employee',money(ytd.uif)],['Net pay',money(ytd.net)]],margin,y,width,[width-48,48],5.5,6.8)
    doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(...muted);doc.text('PAYE and statutory calculations are estimates. Review against current SARS rules and the employment agreement.',margin,Math.min(y+4,288),{maxWidth:width})
  }
  const blob=doc.output('blob')
  const safeName=String(payslip.employeeName||emp.name||'staff').trim().replace(/[^\w.-]+/g,'-')
  const filename='payslip-'+safeName+'-'+(payslip.period||'period')+'-'+layout+'.pdf'
  const url=URL.createObjectURL(blob);revokeLater(url)
  if(opts.download!==false) await downloadJsPdf(doc,filename)
  else if(opts.preview) showInAppPdfViewer(url,filename)
  return {blob,filename}
}

/**
 * Generate a detailed South African employee payslip PDF.
 * Values are snapshots saved when payroll is run so historical slips do not
 * silently change when the employee profile is edited later.
 */
export async function generatePayslipPdf(payslip, company = {}, opts = {}) {
  if (opts.layout === 'example' || opts.layout === 'simplified') return generatePayslipAlternative(payslip, company, opts)
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
    ['Other taxable allowance', ZAR(payslip.otherAllowance)],
  ]
  if (Number(payslip.callOutAllowance) !== 0) earnings.push(['Call-out allowance', ZAR(payslip.callOutAllowance)])
  if (Number(payslip.overtime15) !== 0) earnings.push(['Overtime @ 1.5', ZAR(payslip.overtime15)])
  if (Number(payslip.overtime20) !== 0) earnings.push(['Overtime @ 2.0', ZAR(payslip.overtime20)])
  if (Number(payslip.standbyAllowance) !== 0) earnings.push(['Standby allowance', ZAR(payslip.standbyAllowance)])
  if (Number(payslip.siteAllowance) !== 0) earnings.push(['Site allowance', ZAR(payslip.siteAllowance)])
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
    ['MIBCO / bargaining council employer contribution', ZAR(payslip.mibcoEmployer)],
    ['Employer pension / provident contribution', ZAR(payslip.pensionEmployer)],
    ['Employer provident risk contribution', ZAR(payslip.pensionRiskEmployer)],
    ['ETI — Employment Tax Incentive (employer credit, informational)', ZAR(payslip.eti)],
    ['Fringe benefits recorded', ZAR(payslip.fringeBenefits)],
    ['Tax-deductible deductions recorded', ZAR(payslip.taxDeductibleDeductions)],
    ['PAYE taxable remuneration (estimate basis)', ZAR(payslip.taxableRemuneration ?? payslip.gross)],
  ], { widths: [width - 42, 42] })

  section('Hours, rates & source-code summary')
  const hours = payslip.hours || {}
  table(['Measure', 'Value'], [
    ['Ordinary hours worked', clean(hours.ordinary)],
    ['Hours per pay period', clean(hours.hoursPerPeriod)],
    ['Overtime hours worked', clean(hours.overtime)],
    ['Sunday hours worked', clean(hours.sunday)],
    ['Public holiday hours worked', clean(hours.publicHoliday)],
    ['Ordinary / overtime rate', clean(hours.rate)],
    ['Company rule / bargaining agreement', clean(emp.companyRule)],
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
    ['Taxable remuneration', ZAR(ytd.taxable ?? payslip.taxableRemuneration)],
    ['Fringe benefits', ZAR(ytd.fringeBenefits ?? payslip.fringeBenefits)],
    ['Tax-deductible deductions', ZAR(ytd.taxDeductibleDeductions ?? payslip.taxDeductibleDeductions)],
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
