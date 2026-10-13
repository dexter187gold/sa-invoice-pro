/** WhatsApp / email share helpers for statements, reports, reminders */
import { formatMoney } from './money'
import { buildClientLedger } from './payments'

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

/** Client account statement — invoices + payments with running balance */
export function buildClientStatement(client, invoices, company, payments = []) {
  const co = company?.name || 'SA Invoice Pro'
  const name = client?.name || 'Client'
  const { lines, outstanding } = buildClientLedger(client, invoices, payments)
  const linesOut = [
    `*Account statement — ${co}*`,
    '',
    `Client: *${name}*`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
  ]
  if (!lines.length) {
    linesOut.push('No activity on this account yet.')
  } else {
    linesOut.push('*Activity:*')
    for (const row of lines.slice(-20)) {
      if (row.type === 'payment') {
        linesOut.push(
          `• ${row.date} · ${row.description} · −R${(row.credit || 0).toFixed(2)} · bal R${(row.balance || 0).toFixed(2)}`
        )
      } else {
        linesOut.push(
          `• ${row.date} · ${row.ref} · R${(row.debit || 0).toFixed(2)} · ${row.status} · bal R${(row.balance || 0).toFixed(2)}`
        )
      }
    }
    if (lines.length > 20) linesOut.push(`…and ${lines.length - 20} earlier line(s)`)
    linesOut.push('', `*Outstanding balance: R${outstanding.toFixed(2)}*`)
    if (outstanding > 0) linesOut.push('', 'Please settle at your earliest convenience.')
    else linesOut.push('', 'Account is settled. Thank you!')
  }
  linesOut.push('', `— ${co}`)
  return linesOut.join('\n')
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
