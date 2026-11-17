/**
 * POPIA-oriented data subject export — package of personal data held locally.
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { APP_VERSION } from '../config.js'

export async function buildPopiaExportPackage({ clientId } = {}) {
  const company = await db.getCompany().catch(() => null)
  const clients = (await db.getAll(STORES.clients)) || []
  const invoices = (await db.getAll(STORES.invoices)) || []
  const quotes = (await db.getAll(STORES.quotes)) || []
  const tickets = (await db.getAll(STORES.tickets)) || []
  const payments = (await db.getAll(STORES.payments)) || []
  let employees = []
  try { employees = (await db.getAll(STORES.employees)) || [] } catch {}

  const filterClient = (rows) =>
    clientId ? rows.filter((r) => String(r.clientId) === String(clientId)) : rows

  return {
    exportType: 'popia-data-subject-access',
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    controller: {
      name: company?.name || '',
      email: company?.email || '',
      phone: company?.phone || '',
    },
    subjects: {
      clients: clientId ? clients.filter((c) => String(c.id) === String(clientId)) : clients,
      invoices: filterClient(invoices),
      quotes: filterClient(quotes),
      tickets: filterClient(tickets),
      payments: filterClient(payments),
      employees: clientId ? [] : employees,
    },
    notice:
      'This package is generated from local workspace data for POPIA access/portability requests. Review before sharing.',
  }
}

export async function downloadPopiaExport(opts = {}) {
  const pack = await buildPopiaExportPackage(opts)
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `popia-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return pack
}
