/** WhatsApp / email share helpers for statements, reports, reminders */
import { formatMoney } from './money'

export function toWaNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length >= 9) d = '27' + d.slice(1)
  if (d.length < 10) return ''
  return d
}

export function openWhatsApp(phone, text) {
  const wa = toWaNumber(phone)
  const url = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
  return !!wa
}

export function openEmail(to, subject, body) {
  const url = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = url
  return !!to
}

export function buildOverdueReminder(inv, client, company) {
  const co = company?.name || 'SA Invoice Pro'
  const num = inv.number || inv.id
  const due = inv.dueDate || inv.date || ''
  const bal = Number(inv.amountDue ?? inv.total) || 0
  const total = Number(inv.total) || 0
  const name = client?.name || 'Client'
  return [
    `Hi ${name},`,
    '',
    `Friendly reminder from *${co}*:`,
    '',
    `Invoice *${num}* is overdue.`,
    `Total: R${total.toFixed(2)}`,
    `Balance due: R${bal.toFixed(2)}`,
    due ? `Original due date: ${String(due).slice(0, 10)}` : '',
    '',
    'Please arrange payment at your earliest convenience.',
    'Reply if you have already paid or need a copy of the invoice.',
    '',
    `Thank you — ${co}`,
  ].filter(Boolean).join('\n')
}

/** Client account statement summary (open invoices) */
export function buildClientStatement(client, invoices, company) {
  const co = company?.name || 'SA Invoice Pro'
  const name = client?.name || 'Client'
  const open = (invoices || []).filter(
    (i) => String(i.clientId) === String(client?.id) && ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')
  )
  const totalDue = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const lines = [
    `*Account statement — ${co}*`,
    '',
    `Client: *${name}*`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
  ]
  if (!open.length) {
    lines.push('No outstanding invoices. Thank you!')
  } else {
    lines.push(`Outstanding balance: *R${totalDue.toFixed(2)}*`, '', '*Open invoices:*')
    for (const inv of open.slice(0, 15)) {
      const bal = Number(inv.amountDue ?? inv.total) || 0
      lines.push(
        `• ${inv.number || 'INV'} · ${String(inv.dueDate || inv.date || '').slice(0, 10)} · R${bal.toFixed(2)} · ${inv.status || 'unpaid'}`
      )
    }
    if (open.length > 15) lines.push(`…and ${open.length - 15} more`)
    lines.push('', 'Please settle at your earliest convenience.')
  }
  lines.push('', `— ${co}`)
  return lines.join('\n')
}

export function buildAgedRowReminder(row, client, company) {
  const co = company?.name || 'SA Invoice Pro'
  const name = client?.name || 'Client'
  const bal = Number(row.due) || 0
  return [
    `Hi ${name},`,
    '',
    `Reminder from *${co}*:`,
    '',
    `Invoice *${row.number || row.id}* has been outstanding for *${row.days}* day(s).`,
    `Amount due: R${bal.toFixed(2)}`,
    row.dueDate || row.date ? `Due date: ${String(row.dueDate || row.date).slice(0, 10)}` : '',
    '',
    'Please arrange payment or reply if you need assistance.',
    '',
    `Thank you — ${co}`,
  ].filter(Boolean).join('\n')
}

export function buildReportSummaryShare(stats, company) {
  const co = company?.name || 'SA Invoice Pro'
  const stamp = new Date().toISOString().slice(0, 10)
  return [
    `*${co} — Report summary*`,
    `Date: ${stamp}`,
    '',
    `Paid sales: ${stats.rev}`,
    `Outstanding AR: ${stats.out}`,
    `Collection rate: ${stats.collectionRate}%`,
    `Expenses: ${stats.exp}`,
    `Net: ${stats.net}`,
    `Open invoices: ${stats.openCount}`,
    '',
    '— Generated from SA Invoice Pro',
  ].join('\n')
}
