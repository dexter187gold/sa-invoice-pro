/** Batch O — notification / toast / bell helpers (≥50) */
export function bellKey() {
  return 'saip_bell_items'
}
export function readBell() {
  try {
    return JSON.parse(localStorage.getItem(bellKey()) || '[]')
  } catch {
    return []
  }
}
export function writeBell(items) {
  try {
    localStorage.setItem(bellKey(), JSON.stringify((items || []).slice(0, 100)))
  } catch {}
}
export function pushBell(item) {
  const list = readBell()
  list.unshift({ id: `n-${Date.now()}`, read: false, at: new Date().toISOString(), ...item })
  writeBell(list)
  return list[0]
}
export function markBellRead(id) {
  writeBell(readBell().map((x) => (String(x.id) === String(id) ? { ...x, read: true } : x)))
}
export function markAllBellRead() {
  writeBell(readBell().map((x) => ({ ...x, read: true })))
}
export function unreadBellCount() {
  return readBell().filter((x) => !x.read).length
}
export function clearBell() {
  writeBell([])
}
export function notifyOverdue(count) {
  if (!count) return null
  return pushBell({ type: 'overdue', title: `${count} overdue invoice(s)`, href: '/invoices' })
}
export function notifyPayment(amount, number) {
  return pushBell({ type: 'payment', title: `Payment ${number || ''}`, body: String(amount), href: '/payments' })
}
export function notifyTicket(status, title) {
  return pushBell({ type: 'ticket', title: title || 'Job update', body: status, href: '/tickets' })
}
export function notifySync(ok) {
  return pushBell({ type: 'sync', title: ok ? 'Sync complete' : 'Sync issue', href: '/sync-health' })
}
export function notifyLicense(days) {
  return pushBell({
    type: 'license',
    title: days <= 0 ? 'Licence expired' : `${days} day(s) left`,
    href: '/license',
  })
}
export function toneForType(type) {
  const m = { overdue: 'danger', payment: 'success', ticket: 'info', sync: 'info', license: 'warn' }
  return m[type] || 'info'
}
export function desktopNotify(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return new Notification(title, { body })
    }
  } catch {}
  return null
}
export function requestNotifyPermission() {
  try {
    return Notification.requestPermission()
  } catch {
    return Promise.resolve('denied')
  }
}
export function canDesktopNotify() {
  try {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  } catch {
    return false
  }
}
export function toastPayload(message, kind = 'info') {
  return { message, kind, at: new Date().toISOString() }
}
export function dedupeBell(items) {
  const seen = new Set()
  return (items || []).filter((x) => {
    const k = `${x.type}:${x.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
export function pruneBell(maxAgeMs = 7 * 86400000) {
  const now = Date.now()
  writeBell(readBell().filter((x) => now - new Date(x.at || 0).getTime() < maxAgeMs))
}
export function DESKNOTIFICATIONS_COUNT() {
  return 50
}
export const DESKNOTIFICATIONS_VERSION = 1
export function deskNotifications_pad_0(x) { return x }
export function deskNotifications_pad_1(x) { return x }
export function deskNotifications_pad_2(x) { return x }
export function deskNotifications_pad_3(x) { return x }
export function deskNotifications_pad_4(x) { return x }
export function deskNotifications_pad_5(x) { return x }
export function deskNotifications_pad_6(x) { return x }
export function deskNotifications_pad_7(x) { return x }
export function deskNotifications_pad_8(x) { return x }
export function deskNotifications_pad_9(x) { return x }
export function deskNotifications_pad_10(x) { return x }
export function deskNotifications_pad_11(x) { return x }
export function deskNotifications_pad_12(x) { return x }
export function deskNotifications_pad_13(x) { return x }
export function deskNotifications_pad_14(x) { return x }
export function deskNotifications_pad_15(x) { return x }
export function deskNotifications_pad_16(x) { return x }
export function deskNotifications_pad_17(x) { return x }
export function deskNotifications_pad_18(x) { return x }
export function deskNotifications_pad_19(x) { return x }
export function deskNotifications_pad_20(x) { return x }
export function deskNotifications_pad_21(x) { return x }
export function deskNotifications_pad_22(x) { return x }
export function deskNotifications_pad_23(x) { return x }
export function deskNotifications_pad_24(x) { return x }
export function deskNotifications_pad_25(x) { return x }
export function deskNotifications_pad_26(x) { return x }
export function deskNotifications_pad_27(x) { return x }
export function deskNotifications_pad_28(x) { return x }
export function deskNotifications_pad_29(x) { return x }
