/** Device passport fields for repair jobs (P2). */
export const JOB_TYPES = [
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'cod', label: 'COD / cash on delivery' },
  { id: 'on_site', label: 'On-site' },
  { id: 'remote', label: 'Remote' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'recall', label: 'Recall / comeback' },
  { id: 'workshop', label: 'Workshop bench' },
]

export function emptyPassport() {
  return {
    brand: '', model: '', imei: '', serial: '', colour: '', storage: '',
    passcodeHint: '', conditionIn: '', accessories: '',
  }
}

export function passportSummary(p) {
  if (!p || typeof p !== 'object') return ''
  return [p.brand, p.model, p.imei && `IMEI ${p.imei}`, p.serial && `S/N ${p.serial}`]
    .filter(Boolean).join(' · ')
}

export function mergePassport(existing, patch) {
  return { ...emptyPassport(), ...(existing || {}), ...(patch || {}) }
}
