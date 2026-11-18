/**
 * Build shareable portal magic-link text + optional server issue.
 */
import { Sync } from './sync.js'
import * as db from './db.js'
import { STORES } from './db.js'
import { readMediaBlob } from './mediaOpfs.js'


async function attachmentForPortal(item) {
  if (!item) return null
  if (item.dataUrl) return { id: item.id, name: item.name || 'Attachment', mime: item.mime || 'application/octet-stream', size: item.size || 0, dataUrl: item.dataUrl, createdAt: item.createdAt || '' }
  if (item.opfs && item.path) {
    try {
      const file = await readMediaBlob(item.path)
      if (!file || file.size > 2_500_000) return null
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Could not read attachment'))
        reader.readAsDataURL(file)
      })
      return { id: item.id, name: item.name || file.name || 'Attachment', mime: item.mime || file.type || 'application/octet-stream', size: file.size, dataUrl, createdAt: item.createdAt || '' }
    } catch { return null }
  }
  return null
}

async function buildClientPortalSnapshot(client) {
  const [companies, quotes, invoices, tickets, payments] = await Promise.all([
    db.getCompanies(), db.getAll(STORES.quotes), db.getAll(STORES.invoices),
    db.getAll(STORES.tickets), db.getAll(STORES.payments),
  ])
  const sameClient = (row) => String(row?.clientId || row?.client_id || '') === String(client.id)
  const clientQuotes = quotes.filter(sameClient)
  const clientInvoices = invoices.filter(sameClient)
  const clientTickets = tickets.filter(sameClient)
  const clientPayments = payments.filter((p) => sameClient(p) || clientInvoices.some((i) => String(p.invoiceId || p.invoice_id || p.invoiceNumber || '') === String(i.id || i.number)))
  let budget = 0
  const publishedTickets = []
  for (const ticket of clientTickets) {
    const photos = Array.isArray(ticket.photos) ? ticket.photos : []
    const docs = Array.isArray(ticket.attachments) ? ticket.attachments : []
    const published = []
    for (const item of [...photos, ...docs]) {
      if (budget >= 8_000_000) break
      const file = await attachmentForPortal(item)
      if (file) { budget += Number(file.size) || 0; published.push(file) }
    }
    publishedTickets.push({
      id: ticket.id, title: ticket.title || ticket.subject || 'Service job',
      subject: ticket.subject || '', description: ticket.description || '',
      workDone: ticket.workDone || '', status: ticket.status || 'open',
      jobType: ticket.jobType || '', scheduledDate: ticket.scheduledDate || '',
      scheduledTime: ticket.scheduledTime || '', siteAddress: ticket.siteAddress || ticket.location || '',
      devices: ticket.devices || ticket.serials || '', parts: ticket.parts || [],
      technician: ticket.assignee || ticket.technician || '', priority: ticket.priority || '',
      createdAt: ticket.createdAt || '', updatedAt: ticket.updatedAt || '',
      invoiceId: ticket.invoiceId || '', attachments: published,
    })
  }
  const publishedInvoices = clientInvoices.map((inv) => ({
    ...inv,
    photos: [], attachments: [],
  }))
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const totalPaid = clientPayments.reduce((sum, p) => sum + (Number(p.amount || p.paidAmount || p.value) || 0), 0)
  return {
    company: companies?.[0] || {}, client,
    quotes: clientQuotes, invoices: publishedInvoices,
    tickets: publishedTickets, payments: clientPayments,
    accountStatement: {
      generatedAt: new Date().toISOString(), totalInvoiced, totalPaid,
      openBalance: Math.max(0, totalInvoiced - totalPaid),
      entries: [
        ...clientInvoices.map((i) => ({ date: i.date, type: 'Invoice', reference: i.number || i.id, description: i.notes || 'Invoice issued', debit: Number(i.total) || 0, credit: 0 })),
        ...clientPayments.map((p) => ({ date: p.date || p.paidAt, type: 'Payment', reference: p.reference || p.invoiceNumber || '', description: p.method || 'Payment received', debit: 0, credit: Number(p.amount || p.paidAmount || p.value) || 0 })),
      ].sort((a,b) => String(a.date || '').localeCompare(String(b.date || ''))),
    },
  }
}

export async function issuePortalMagicLink(client, { days = 90 } = {}) {
  if (!client?.id) throw new Error('Client required')
  if (!Sync.isLoggedIn()) throw new Error('Sign in to cloud under Settings first')
  const snapshot = await buildClientPortalSnapshot(client)
  const data = await Sync.createPortalLink(client.id, { days, snapshot })
  let pinInfo = null
  const email = String(client.email || '').trim().toLowerCase()
  if (email.includes('@') && Sync.issueClientPortalLogin) {
    try {
      pinInfo = await Sync.issueClientPortalLogin({
        clientId: client.id,
        email,
        name: client.name || email,
        phone: client.phone || '',
      })
    } catch (e) {
      console.warn('[magic-link] pin issue', e?.message || e)
    }
  }
  const url = data?.url || pinInfo?.url || ''
  const pin = pinInfo?.pin || pinInfo?.account?.pin || pinInfo?.temporaryPin
  const user = pinInfo?.username || pinInfo?.email || email
  const message = pin
    ? `Your client portal (valid ~${days} days)\n${url}\nLogin: ${user}\nPIN: ${pin}\nOr open the link on this device for one-tap access.`
    : `Your client portal (valid ~${days} days)\n${url}`
  return { url, pin, username: user, message, raw: data, pinInfo }
}
