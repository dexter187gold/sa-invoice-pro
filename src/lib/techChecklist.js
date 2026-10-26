/** Workshop tech checklists (FRP / intake / QC) — P2.3 */
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
      'Loaner issued or declined',
      'Expected timeline communicated',
    ],
  },
  frp: {
    id: 'frp',
    label: 'FRP / account lock',
    items: [
      'Legal ownership documents on file',
      'Device IMEI verified vs box/invoice',
      'Google / iCloud account status checked',
      'Client signed authorization for account work',
      'No stolen-device flags known',
      'MDM / company profile checked (if any)',
      'Work completed within shop policy',
      'Client identity re-verified at collection',
    ],
  },
  qc: {
    id: 'qc',
    label: 'QC before return',
    items: [
      'Powers on / charge tested',
      'Display / touch OK',
      'Cameras / speakers / mic OK',
      'Network / Wi‑Fi / Bluetooth OK',
      'Buttons / biometrics OK',
      'No leftover diagnostic accounts / notes on device',
      'Parts used matched job card',
      'Job card signed by tech',
      'Client sign-off ready',
    ],
  },
  data: {
    id: 'data',
    label: 'Data / backup',
    items: [
      'Backup destination confirmed',
      'Capacity checked',
      'Sensitive data handling noted (POPIA)',
      'Restore verified on target',
      'Source media returned / wiped per policy',
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

export function checklistProgress(type, state) {
  const def = CHECKLISTS[type]
  if (!def) return { done: 0, total: 0, pct: 0, complete: true }
  const st = state && typeof state === 'object' ? state : {}
  const total = def.items.length
  const done = def.items.reduce((n, _, i) => n + (st[i] ? 1 : 0), 0)
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: done === total && total > 0 }
}

export const QC_GATE_STATUSES = ['ready', 'ready_for_collection', 'awaiting_collection', 'resolved']

export function needsQcGate(nextStatus) {
  const st = String(nextStatus || '').toLowerCase()
  return QC_GATE_STATUSES.some((s) => st === s) || st.includes('ready') || st === 'resolved'
}

export function canMoveToReady(ticket, nextStatus) {
  if (!needsQcGate(nextStatus)) return { ok: true }
  const type = ticket?.checklistType || 'intake'
  const state = ticket?.checklist || {}
  if (type === 'qc') {
    const p = checklistProgress('qc', state)
    if (!p.complete) {
      return {
        ok: false,
        message: `QC incomplete (${p.done}/${p.total}). Finish QC checklist before marking ready/resolved.`,
      }
    }
    return { ok: true }
  }
  return {
    ok: false,
    message: 'Switch checklist type to “QC before return”, complete all items, then mark ready.',
  }
}
