/**
 * Sample workspace data for demos and sales walkthroughs.
 * Safe to re-run: uses fixed demo IDs and upserts via put.
 */
import * as db from './db'
import { STORES } from './db'

const DEMO = {
  client: 'demo-client-acme',
  product: 'demo-product-licence',
  service: 'demo-service-onsite',
  invoice: 'demo-inv-001',
  quote: 'demo-qt-001',
  ticket: 'demo-ticket-001',
}

export async function loadDemoWorkspace({ companyName } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  await db.put(STORES.clients, {
    id: DEMO.client,
    name: 'Acme Workshop (Pty) Ltd',
    company: 'Acme Workshop',
    email: 'accounts@acme-demo.co.za',
    phone: '+27 11 555 0100',
    vatNumber: '4123456789',
    address: '12 Industrial Rd, Jet Park, Gauteng',
    createdAt: new Date().toISOString(),
  })

  await db.put(STORES.products, {
    id: DEMO.product,
    name: 'Microsoft 365 Business (annual)',
    sku: 'M365-BIZ',
    price: 1899,
    stock: 25,
    description: 'Demo product line for invoice catalogues',
  })

  await db.put(STORES.services, {
    id: DEMO.service,
    name: 'On-site support (per hour)',
    sku: 'ONSITE-HR',
    price: 450,
    description: 'Standard on-site technician rate',
  })

  const lines = [
    { description: 'On-site diagnostic & repair', qty: 2, price: 450 },
    { description: 'Replacement SSD 1TB', qty: 1, price: 1299 },
  ]
  const exclusive = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const vat = Math.round(exclusive * 0.15 * 100) / 100
  const total = Math.round((exclusive + vat) * 100) / 100

  await db.put(STORES.invoices, {
    id: DEMO.invoice,
    clientId: DEMO.client,
    number: `INV-${new Date().getFullYear()}-DEMO`,
    date: today,
    dueDate: due,
    status: 'unpaid',
    lines,
    exclusive,
    vatAmount: vat,
    total,
    amountPaid: 0,
    amountDue: total,
    notes: 'Demo invoice — replace with live clients before go-live.',
    serviceType: 'On-site repair',
    siteAddress: '12 Industrial Rd, Jet Park',
    technician: 'Demo Tech',
  })

  await db.put(STORES.quotes, {
    id: DEMO.quote,
    clientId: DEMO.client,
    number: `QT-${new Date().getFullYear()}-DEMO`,
    date: today,
    validUntil: due,
    status: 'draft',
    templateId: 'adhoc',
    lines: [
      { description: 'Network assessment', qty: 1, price: 2500 },
      { description: 'Managed Wi-Fi install', qty: 1, price: 4800 },
    ],
    exclusive: 7300,
    vatAmount: 1095,
    total: 8395,
    serviceType: 'Network upgrade',
    devices: '4 × AP · 1 × Switch',
    accountType: 'COD Account',
    isQuote: true,
  })

  await db.put(STORES.tickets, {
    id: DEMO.ticket,
    clientId: DEMO.client,
    subject: 'POS terminal offline — demo job card',
    status: 'open',
    priority: 'high',
    serviceType: 'onsite',
    siteAddress: '12 Industrial Rd, Jet Park',
    assignee: 'Demo Tech',
    description: 'Terminal will not connect after power outage.',
    workDone: '',
    contactName: 'Thabo (floor manager)',
    contactPhone: '+27 82 555 0199',
    createdAt: new Date().toISOString(),
  })

  await db.put(STORES.expenses, {
    id: 'demo-exp-001',
    date: today,
    description: 'Demo — fuel to client site',
    amount: 450,
    category: 'Travel',
    vendor: 'Engen',
    accountCode: '6300',
  })

  return {
    clientId: DEMO.client,
    invoiceId: DEMO.invoice,
    quoteId: DEMO.quote,
    ticketId: DEMO.ticket,
    companyHint: companyName || 'Your company',
  }
}
