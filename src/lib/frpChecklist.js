/** FRP / activation lock / MDM checklist for repair desks (P2.3). */

export const FRP_ITEMS = [
  { id: 'frp', label: 'FRP / Google lock cleared' },
  { id: 'icloud', label: 'iCloud / Activation Lock off' },
  { id: 'mdm', label: 'MDM / DEP profile removed' },
  { id: 'sim', label: 'SIM / carrier lock checked' },
  { id: 'backup', label: 'Customer backup confirmed or declined' },
  { id: 'qc', label: 'QC functional test passed' },
]

export function emptyFrpState() {
  const o = {}
  for (const i of FRP_ITEMS) o[i.id] = { pass: null, note: '', at: null }
  return o
}

export function frpSummary(state) {
  if (!state || typeof state !== 'object') return { done: 0, total: FRP_ITEMS.length, ready: false }
  let done = 0
  for (const i of FRP_ITEMS) {
    if (state[i.id]?.pass === true) done++
  }
  return { done, total: FRP_ITEMS.length, ready: done === FRP_ITEMS.length }
}

export function setFrpItem(state, id, pass, note = '') {
  return {
    ...(state || emptyFrpState()),
    [id]: {
      pass: pass === true ? true : pass === false ? false : null,
      note: String(note || ''),
      at: new Date().toISOString(),
    },
  }
}
