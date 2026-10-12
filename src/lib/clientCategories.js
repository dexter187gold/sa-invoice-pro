/** Client billing / relationship categories for SA Invoice Pro */

export const CLIENT_CATEGORIES = [
  { id: 'cod', label: 'COD', description: 'Cash on delivery / collection' },
  { id: 'account', label: 'Account', description: 'Charge account (e.g. 7–30 days)' },
  { id: 'sla', label: 'SLA', description: 'Service level agreement customer' },
  { id: 'contract', label: 'Contract', description: 'Retainer / fixed contract' },
  { id: 'walk_in', label: 'Walk-in', description: 'Once-off / walk-in' },
  { id: 'wholesale', label: 'Wholesale', description: 'Reseller / dealer pricing' },
  { id: 'internal', label: 'Internal', description: 'Own company / staff' },
  { id: 'other', label: 'Other', description: 'Uncategorised' },
]

export function categoryLabel(id) {
  const c = CLIENT_CATEGORIES.find((x) => x.id === id)
  return c?.label || id || '—'
}

export function categoryOf(client) {
  return client?.category || client?.clientCategory || 'other'
}
