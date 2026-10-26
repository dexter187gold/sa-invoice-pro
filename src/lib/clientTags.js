/** Client tags: VIP, COD, account, risk, etc. */

export const CLIENT_TAG_PRESETS = [
  { id: 'vip', label: 'VIP', color: '#a78bfa' },
  { id: 'cod', label: 'COD', color: '#fbbf24' },
  { id: 'account', label: 'Account', color: '#38bdf8' },
  { id: 'risk', label: 'Risk', color: '#f87171' },
  { id: 'sla', label: 'SLA', color: '#34d399' },
  { id: 'retainer', label: 'Retainer', color: '#fb923c' },
]

export function normalizeTags(raw) {
  if (Array.isArray(raw)) return [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
  if (typeof raw === 'string') {
    return [...new Set(raw.split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean))]
  }
  return []
}

export function clientHasTag(client, tag) {
  const tags = normalizeTags(client?.tags)
  return tags.includes(String(tag).toLowerCase())
}

export function filterClientsByTag(clients = [], tag) {
  if (!tag || tag === 'all') return clients
  return clients.filter((c) => clientHasTag(c, tag))
}

export function toggleClientTag(tags, tag) {
  const list = normalizeTags(tags)
  const t = String(tag).toLowerCase()
  if (list.includes(t)) return list.filter((x) => x !== t)
  return [...list, t]
}
