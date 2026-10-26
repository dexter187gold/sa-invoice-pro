/** Desk rules — suggestions + auto-chase hints (P7.9). */
import { daysPastDue, isOpenInvoice } from './chasePack'
import { invoicesDueForChase } from './collections'

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
  const ptp = invoicesDueForChase(invoices)
  if (ptp.length) {
    tips.push({
      id: 'ptp_due',
      severity: 'warn',
      title: `${ptp.length} promise-to-pay chase(s) due`,
      action: 'Invoices → Chase promises due',
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
  const ready = (tickets || []).filter((t) => {
    const st = String(t.status || '').toLowerCase()
    return st.includes('ready') || st === 'resolved'
  })
  if (ready.length) {
    tips.push({
      id: 'collection_ring',
      severity: 'info',
      title: `${ready.length} device(s) ready for collection`,
      action: 'Home → Collection ring',
      href: '/',
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
