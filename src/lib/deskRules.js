/** Lightweight desk rules — suggestions (not silent auto-spam). */
import { daysPastDue, isOpenInvoice } from './chasePack'

export function evaluateDeskRules({ invoices = [], tickets = [], clients = [] } = {}) {
  const tips = []
  const open = (invoices || []).filter(isOpenInvoice)
  const hot = open.filter((i) => daysPastDue(i) >= 7)
  if (hot.length) {
    tips.push({
      id: 'overdue7',
      severity: 'warn',
      title: `${hot.length} invoice(s) ≥7 days overdue`,
      action: 'Open Invoices → Chase pack (ranked)',
      href: '/invoices',
    })
  }
  const stuck = (tickets || []).filter((t) => {
    const st = String(t.status || '')
    if (['closed', 'resolved', 'ready', 'ready_for_collection'].includes(st)) return false
    const start = t.createdAt || t.date
    if (!start) return false
    const hrs = (Date.now() - new Date(start).getTime()) / 3600000
    return hrs > 48
  })
  if (stuck.length) {
    tips.push({
      id: 'jobs48',
      severity: 'info',
      title: `${stuck.length} open job(s) older than 48h`,
      action: 'Review Tickets Kanban',
      href: '/tickets',
    })
  }
  const noPhone = open.filter((i) => {
    const c = (clients || []).find((x) => String(x.id) === String(i.clientId))
    return !(c?.phone || i.clientPhone)
  })
  if (noPhone.length) {
    tips.push({
      id: 'nophone',
      severity: 'info',
      title: `${noPhone.length} open invoice(s) without client phone`,
      action: 'Add phones for WhatsApp chase',
      href: '/clients',
    })
  }
  return tips
}
