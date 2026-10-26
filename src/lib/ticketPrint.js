/** Printable job slip + deep link (P2.12). */
import { ticketDeepLink } from './share'
import { passportSummary } from './devicePassport'

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
