/** Per-page owner KPI builders — pure, no side effects. */
import { agedBuckets } from './accounting.js'
import { quoteWinRate, topClientsByRevenue } from './insights.js'

export function invoicePageInsights({ invoices = [], payments = [] }) {
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status) && !i.isCredit)
  const overdue = invoices.filter((i) => i.status === 'overdue' && !i.isCredit)
  const partial = invoices.filter((i) => i.status === 'partial' && !i.isCredit)
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const overdueAmt = overdue.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  const month = new Date().toISOString().slice(0, 7)
  const paidM = invoices
    .filter((i) => i.status === 'paid' && !i.isCredit && String(i.date || '').startsWith(month))
    .reduce((s, i) => s + (Number(i.total) || 0), 0)
  const collectedM = payments
    .filter((p) => String(p.date || '').startsWith(month))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const aging = agedBuckets(invoices)
  const promisesDue = invoices.filter((i) => {
    if (!i.nextChaseDate) return false
    if (!['unpaid', 'partial', 'overdue'].includes(i.status || '')) return false
    return String(i.nextChaseDate).slice(0, 10) <= new Date().toISOString().slice(0, 10)
  }).length
  return {
    items: [
      { label: 'Open AR', value: ar, money: true, tone: ar > 0 ? 'warn' : 'good', href: '?status=unpaid' },
      { label: 'Overdue', value: overdueAmt, money: true, tone: overdue.length ? 'bad' : 'good', hint: `${overdue.length} inv`, href: '?status=overdue' },
      { label: 'Partial', value: partial.length, tone: partial.length ? 'warn' : undefined, href: '?status=partial' },
      { label: 'Paid (month)', value: paidM, money: true, tone: 'good' },
      { label: 'Collected', value: collectedM, money: true, tone: 'good' },
      { label: '90d+', value: aging.buckets?.older || 0, money: true, tone: (aging.buckets?.older || 0) > 0 ? 'bad' : undefined },
      { label: 'Promises due', value: promisesDue, tone: promisesDue ? 'warn' : 'good' },
    ],
    tip: overdue.length
      ? `${overdue.length} overdue — use Chase pack (ranked) then Flag overdue if dates slipped.`
      : 'Books look clean — keep recording payments so AR stays accurate.',
  }
}

export function quotePageInsights({ quotes = [] }) {
  const win = quoteWinRate(quotes)
  const accepted = quotes.filter((q) => String(q.status || '').toLowerCase() === 'accepted').length
  const draft = win.draft
  const month = new Date().toISOString().slice(0, 7)
  const pipeline = quotes
    .filter((q) => ['draft', 'sent', 'open', 'accepted'].includes(String(q.status || 'draft').toLowerCase()))
    .reduce((s, q) => s + (Number(q.total) || 0), 0)
  const thisMonth = quotes.filter((q) => String(q.date || '').startsWith(month)).length
  return {
    items: [
      { label: 'Pipeline', value: pipeline, money: true, tone: 'good' },
      { label: 'Draft', value: draft, href: '?status=draft' },
      { label: 'Accepted', value: accepted, tone: accepted ? 'good' : undefined, href: '?status=accepted' },
      { label: 'Win rate', value: win.rate != null ? `${win.rate}%` : '—', tone: win.rate >= 50 ? 'good' : win.rate != null ? 'warn' : undefined, hint: `${win.won} won / ${win.lost} lost` },
      { label: 'This month', value: thisMonth },
      { label: 'Declined', value: win.lost, tone: win.lost ? 'warn' : undefined, href: '?status=rejected' },
    ],
    tip: accepted
      ? `${accepted} accepted quote(s) ready to convert to invoices.`
      : 'Share portal links so clients can Accept/Decline without chasing email threads.',
  }
}

export function clientPageInsights({ clients = [], invoices = [], payments = [] }) {
  const top = topClientsByRevenue({ invoices, clients, payments }, 1)[0]
  const withPhone = clients.filter((c) => c.phone).length
  const withEmail = clients.filter((c) => c.email).length
  const openByClient = {}
  for (const inv of invoices) {
    if (!['unpaid', 'partial', 'overdue'].includes(inv.status || '')) continue
    const id = String(inv.clientId || '')
    openByClient[id] = (openByClient[id] || 0) + (Number(inv.amountDue ?? inv.total) || 0)
  }
  const debtors = Object.keys(openByClient).length
  const missingContact = clients.filter((c) => !c.phone && !c.email).length
  return {
    items: [
      { label: 'Clients', value: clients.length },
      { label: 'With phone', value: withPhone, tone: withPhone < clients.length ? 'warn' : 'good' },
      { label: 'With email', value: withEmail },
      { label: 'Open debtors', value: debtors, tone: debtors ? 'warn' : 'good' },
      { label: 'No contact', value: missingContact, tone: missingContact ? 'bad' : 'good' },
      { label: 'Top payer', value: top?.name ? String(top.name).slice(0, 14) : '—', hint: top ? `paid` : '' },
    ],
    tip: missingContact
      ? `${missingContact} client(s) have no phone or email — chase and portal suffer.`
      : 'Keep tags and payment terms updated for cleaner credit control.',
  }
}

export function ticketPageInsights({ tickets = [] }) {
  const open = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()))
  const urgent = open.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
  const waiting = open.filter((t) => (t.status || '') === 'waiting').length
  const billable = open.filter((t) => t.billable || t.status === 'resolved' || t.status === 'done').length
  let slaRisk = 0
  for (const t of open) {
    const start = t.createdAt || t.date
    if (!start) continue
    const hrs = (Date.now() - new Date(start).getTime()) / 3600000
    const limit = t.priority === 'urgent' ? 4 : t.priority === 'high' ? 12 : 24
    if (hrs > limit) slaRisk++
  }
  return {
    items: [
      { label: 'Open jobs', value: open.length, tone: open.length ? 'warn' : 'good' },
      { label: 'High/Urgent', value: urgent, tone: urgent ? 'bad' : 'good' },
      { label: 'Waiting', value: waiting, tone: waiting ? 'warn' : undefined },
      { label: 'SLA risk', value: slaRisk, tone: slaRisk ? 'bad' : 'good' },
      { label: 'Ready to bill', value: billable, tone: billable ? 'good' : undefined },
      { label: 'All time', value: tickets.length },
    ],
    tip: slaRisk
      ? `${slaRisk} job(s) past SLA target — update status or message the client.`
      : 'Desk is on track — bill resolved jobs before they go cold.',
  }
}

export function paymentPageInsights({ payments = [], invoices = [] }) {
  const month = new Date().toISOString().slice(0, 7)
  const thisM = payments.filter((p) => String(p.date || '').startsWith(month))
  const sumM = thisM.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const todaySum = payments
    .filter((p) => String(p.date || '').slice(0, 10) === today)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status))
  const ar = open.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)
  return {
    items: [
      { label: 'Today', value: todaySum, money: true, tone: 'good' },
      { label: 'This month', value: sumM, money: true, tone: 'good' },
      { label: 'Payments', value: payments.length },
      { label: 'Still open AR', value: ar, money: true, tone: ar > 0 ? 'warn' : 'good' },
      { label: 'Open inv', value: open.length },
    ],
    tip: 'Record every EFT/cash against the right invoice so Accounting auto-post stays clean.',
  }
}

export function expensePageInsights({ expenses = [] }) {
  const month = new Date().toISOString().slice(0, 7)
  const thisM = expenses.filter((e) => String(e.date || '').startsWith(month))
  const sumM = thisM.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const byCat = {}
  for (const e of thisM) {
    const c = e.category || 'Other'
    byCat[c] = (byCat[c] || 0) + (Number(e.amount) || 0)
  }
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  return {
    items: [
      { label: 'This month', value: sumM, money: true, tone: 'warn' },
      { label: 'Lines', value: thisM.length },
      { label: 'All time', value: expenses.length },
      { label: 'Top category', value: top ? String(top[0]).slice(0, 14) : '—', hint: top ? 'R' : '' },
    ],
    tip: 'Tag VAT on supplier slips so Accounting VAT201 estimate stays useful.',
  }
}

export function productPageInsights({ products = [], services = [] }) {
  const low = products.filter((p) => {
    const s = Number(p.stock)
    return Number.isFinite(s) && s <= 5
  })
  const value = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0)
  return {
    items: [
      { label: 'Products', value: products.length },
      { label: 'Services', value: services.length },
      { label: 'Low stock', value: low.length, tone: low.length ? 'warn' : 'good' },
      { label: 'Stock value', value: value, money: true },
    ],
    tip: low.length
      ? `${low.length} item(s) at or below 5 units — reorder or transfer from another branch.`
      : 'Catalog healthy — use Install IT pack for a starter service menu.',
  }
}

export function employeePageInsights({ employees = [] }) {
  const active = employees.filter((e) => (e.status || 'active') === 'active')
  const archived = employees.filter((e) => e.status === 'archived')
  const bill = active.reduce((s, e) => s + (Number(e.salary) || 0), 0)
  const uif = active.filter((e) => e.uif !== false).length
  return {
    items: [
      { label: 'Active', value: active.length, tone: 'good' },
      { label: 'Archived', value: archived.length },
      { label: 'Salary bill', value: bill, money: true },
      { label: 'UIF on', value: uif },
    ],
    tip: 'Keep SA ID + tax numbers current so EMP201 / payroll packs stay accurate.',
  }
}

export function payrollPageInsights({ employees = [], payrollRuns = [] }) {
  const active = (employees || []).filter((e) => (e.status || 'active') === 'active')
  const bill = active.reduce((s, e) => s + (Number(e.salary) || 0), 0)
  const runs = payrollRuns || []
  return {
    items: [
      { label: 'Headcount', value: active.length },
      { label: 'Gross bill', value: bill, money: true },
      { label: 'Runs saved', value: runs.length },
    ],
    tip: 'Run a dry payroll before payday, then export EMP201 pack for SARS.',
  }
}

export function bankPageInsights({ payments = [], expenses = [] }) {
  const month = new Date().toISOString().slice(0, 7)
  const pin = payments.filter((p) => String(p.date || '').startsWith(month)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const pout = expenses.filter((e) => String(e.date || '').startsWith(month)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  return {
    items: [
      { label: 'In (month)', value: pin, money: true, tone: 'good' },
      { label: 'Out (month)', value: pout, money: true, tone: 'warn' },
      { label: 'Net', value: pin - pout, money: true, tone: pin - pout >= 0 ? 'good' : 'bad' },
    ],
    tip: 'Import bank CSV → review matches → apply only rows you approve (no silent overwrite).',
  }
}

export function reportPageInsights({ invoices = [], expenses = [], payments = [] }) {
  const month = new Date().toISOString().slice(0, 7)
  const sales = invoices
    .filter((i) => !i.isCredit && String(i.date || '').startsWith(month) && i.status !== 'cancelled')
    .reduce((s, i) => s + (Number(i.total) || 0), 0)
  const exp = expenses.filter((e) => String(e.date || '').startsWith(month)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const cash = payments.filter((p) => String(p.date || '').startsWith(month)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  return {
    items: [
      { label: 'Sales MTD', value: sales, money: true, tone: 'good' },
      { label: 'Expenses MTD', value: exp, money: true, tone: 'warn' },
      { label: 'Cash in MTD', value: cash, money: true, tone: 'good' },
      { label: 'Est. margin', value: sales - exp, money: true, tone: sales - exp >= 0 ? 'good' : 'bad' },
    ],
    tip: 'Cross-check Reports vs Accounting P&L before month-end close.',
  }
}

export function recurringPageInsights({ recurring = [], invoices = [] }) {
  const active = (recurring || []).filter((r) => r.active !== false)
  return {
    items: [
      { label: 'Templates', value: (recurring || []).length },
      { label: 'Active', value: active.length, tone: 'good' },
      { label: 'Invoices', value: (invoices || []).length },
    ],
    tip: 'Generate due retainers from Invoices → Generate recurring before month-end.',
  }
}

export function documentPageInsights({ documents = [] }) {
  const docs = documents || []
  return {
    items: [
      { label: 'Files', value: docs.length },
    ],
    tip: 'Store signed quotes, POPIA consents, and supplier slips here for audits.',
  }
}
