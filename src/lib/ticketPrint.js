/** Printable job slip + deep link (P2.12). */
import { ticketDeepLink } from './share'
import { passportSummary } from './devicePassport'
import { loadJsPdf } from './loadJsPdf'
import { readMediaBlob } from './mediaOpfs'

export function buildJobSlipHtml(ticket, company = {}, client = {}) {
  const link = ticketDeepLink(ticket?.id)
  const device = passportSummary(ticket?.passport) || ticket?.devices || ''
  const co = company.name || 'Workshop'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Job ${ticket?.title || ''}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111;max-width:480px;margin:0 auto}
h1{font-size:18px;margin:0 0 4px}.muted{color:#555;font-size:13px}
.box{border:2px solid #111;border-radius:12px;padding:16px;margin-top:12px}
.qr{font-family:ui-monospace,monospace;font-size:11px;word-break:break-all;background:#f4f4f5;padding:10px;border-radius:8px;margin-top:12px}
@media print{button{display:none}}
</style></head><body>
<button onclick="print()">Print</button>
<h1>${co}</h1>
<p class="muted">Job card · ${new Date().toLocaleString()}</p>
<div class="box">
  <strong>${ticket?.title || 'Job'}</strong>
  <p class="muted">Status: ${ticket?.status || 'open'} · Priority: ${ticket?.priority || 'normal'}</p>
  <p>Client: ${client?.name || ticket?.contactName || '—'}</p>
  <p>Phone: ${ticket?.contactPhone || client?.phone || '—'}</p>
  ${device ? `<p>Device: ${device}</p>` : ''}
  <p class="muted">${(ticket?.description || ticket?.notes || '').toString().slice(0, 280)}</p>
  <div class="qr">Open in app:<br/>${link}</div>
</div>
<script>setTimeout(()=>print(),400)</script>
</body></html>`
}

export function printJobSlip(ticket, company, client) {
  const html = buildJobSlipHtml(ticket, company, client)
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return false
  w.document.write(html)
  w.document.close()
  return true
}


function safeFileName(value) {
  return String(value || 'job-card').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'job-card'
}

/** Build a shareable, multi-page job-card PDF with customer-facing work details. */
export async function buildJobCardPdf(ticket, company = {}, client = {}) {
  const JsPdf = await loadJsPdf()
  const doc = new JsPdf({ unit: 'mm', format: 'a4' })
  const left = 15
  const width = 180
  let y = 18
  const title = String(ticket?.number || ticket?.jobNumber || ticket?.title || ticket?.id || 'Job card')
  const status = String(ticket?.status || 'open').replace(/_/g, ' ')
  const addSection = (label, value) => {
    if (value == null || String(value).trim() === '') return
    const lines = doc.splitTextToSize(String(value), width)
    const needed = 8 + lines.length * 5
    if (y + needed > 275) { doc.addPage(); y = 18 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(22, 101, 52)
    doc.text(label.toUpperCase(), left, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(40, 50, 60)
    doc.text(lines, left, y)
    y += lines.length * 5 + 5
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(22, 101, 52)
  doc.text(String(company?.name || 'SA Invoice Pro').slice(0, 55), left, y)
  y += 10
  doc.setFontSize(15)
  doc.setTextColor(25, 35, 45)
  doc.text('JOB CARD / SERVICE REPORT', left, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Reference: ' + title, left, y); y += 5
  doc.text('Status: ' + status + '    Priority: ' + String(ticket?.priority || 'normal'), left, y); y += 5
  doc.text('Generated: ' + new Date().toLocaleString('en-ZA'), left, y); y += 8
  doc.setDrawColor(210, 220, 215)
  doc.line(left, y, left + width, y)
  y += 8
  addSection('Customer', client?.name || ticket?.contactName || '—')
  addSection('Contact details', [ticket?.contactPhone || client?.phone, ticket?.contactEmail || client?.email].filter(Boolean).join(' · '))
  addSection('Job / service', ticket?.title || ticket?.subject || ticket?.jobType || 'Service')
  addSection('Description / reported issue', ticket?.description || ticket?.notes)
  addSection('Work completed', ticket?.workDone)
  addSection('Device / equipment', ticket?.devices || ticket?.device || passportSummary(ticket?.passport))
  addSection('Serial numbers', ticket?.serials || ticket?.serialNumbers)
  addSection('Location', ticket?.siteAddress || ticket?.address)
  addSection('Assigned technician', ticket?.assignee || ticket?.technician)
  addSection('Parts / materials', Array.isArray(ticket?.parts) ? ticket.parts.map((x) => typeof x === 'string' ? x : [x.name || x.description, x.qty ? 'x' + x.qty : ''].filter(Boolean).join(' ')).join(', ') : ticket?.parts)
  addSection('Customer-facing notes', ticket?.customerNotes || ticket?.publicNotes)
  addSection('Attachments included separately', [...(ticket?.photos || []), ...(ticket?.attachments || [])].map((x) => x.name || 'Attachment').join(', '))
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(120, 130, 140)
    doc.text(String(company?.name || 'SA Invoice Pro') + ' · Job card ' + title + ' · Page ' + page + '/' + pages, 105, 289, { align: 'center' })
  }
  return doc
}

/** Build actual File objects for job-card photos/documents stored inline or in OPFS. */
export async function getJobCardShareFiles(ticket, jobPdfFile) {
  const files = [jobPdfFile]
  const source = [...(Array.isArray(ticket?.photos) ? ticket.photos : []), ...(Array.isArray(ticket?.attachments) ? ticket.attachments : [])]
  let total = jobPdfFile?.size || 0
  const skipped = []
  for (const item of source.slice(0, 10)) {
    try {
      let blob = null
      if (item?.dataUrl) {
        const response = await fetch(item.dataUrl)
        if (response.ok) blob = await response.blob()
      } else if (item?.opfs && item?.path) {
        blob = await readMediaBlob(item.path)
      }
      if (!blob) { skipped.push(item?.name || 'An attachment'); continue }
      if (blob.size > 5000000 || total + blob.size > 12000000) {
        skipped.push(item?.name || 'An attachment (size limit)')
        continue
      }
      const mime = blob.type || item.mime || 'application/octet-stream'
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'].includes(mime)) {
        skipped.push(item?.name || 'Unsupported attachment')
        continue
      }
      const name = safeFileName(item?.name || 'job-attachment') + (String(item?.name || '').includes('.') ? '' : (mime === 'application/pdf' ? '.pdf' : mime.startsWith('image/') ? '.jpg' : '.txt'))
      files.push(new File([blob], name, { type: mime }))
      total += blob.size
    } catch {
      skipped.push(item?.name || 'An attachment')
    }
  }
  if (source.length > 10) skipped.push((source.length - 10) + ' additional attachment(s)')
  return { files, skipped }
}
