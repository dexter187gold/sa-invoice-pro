export const CHECKLISTS = {
  intake: {
    id: 'intake',
    label: 'Device intake',
    items: [
      'Owner ID / proof of ownership noted',
      'Passcode / pattern obtained (or N/A)',
      'Physical condition photographed',
      'SIM / SD removed or noted',
      'Backup advised / declined',
      'Quote approved before parts order',
    ],
  },
  frp: {
    id: 'frp',
    label: 'FRP / account lock',
    items: [
      'Legal ownership documents on file',
      'Device IMEI verified vs box/invoice',
      'Google / iCloud account status checked',
      'Client signed authorization',
      'No stolen-device flags known',
      'Work completed within policy',
    ],
  },
  qc: {
    id: 'qc',
    label: 'QC before return',
    items: [
      'Powers on / charge tested',
      'Display / touch OK',
      'Cameras / speakers OK',
      'Network / Wi‑Fi OK',
      'No leftover personal tech notes on device',
      'Job card signed',
    ],
  },
}

export function emptyChecklistState(type) {
  const def = CHECKLISTS[type]
  if (!def) return {}
  const o = {}
  def.items.forEach((_, i) => { o[i] = false })
  return o
}
