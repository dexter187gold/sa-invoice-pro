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
