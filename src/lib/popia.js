/** POPIA-oriented data export / erase helpers + consent log */
export function exportClientPack(client, { invoices = [], tickets = [], payments = [] } = {}) {
  const id = String(client?.id)
  return {
    exportedAt: new Date().toISOString(),
    purpose: 'data_subject_access_request',
    client,
    invoices: invoices.filter((i) => String(i.clientId) === id),
    tickets: tickets.filter((t) => String(t.clientId) === id),
    payments: payments.filter((p) => String(p.clientId) === id),
  }
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const CONSENT_KEY = 'saip_popia_consents'

export function loadConsents() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || '[]')
  } catch {
    return []
  }
}

export function recordConsent({ clientId, type = 'processing', note = '' }) {
  const row = {
    id: `consent-${Date.now()}`,
    clientId: clientId || null,
    type,
    note: String(note || '').slice(0, 200),
    at: new Date().toISOString(),
  }
  const list = loadConsents()
  list.unshift(row)
  localStorage.setItem(CONSENT_KEY, JSON.stringify(list.slice(0, 500)))
  return row
}

export function consentsForClient(clientId) {
  return loadConsents().filter((c) => String(c.clientId) === String(clientId))
}
