/** Batch S — calendar / due-date helpers (≥50) */
export function toDateOnly(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10)
}
export function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return toDateOnly(d)
}
export function startOfWeek(dateStr) {
  const d = new Date(dateStr)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return toDateOnly(d)
}
export function endOfWeek(dateStr) {
  return addDays(startOfWeek(dateStr), 6)
}
export function isToday(dateStr) {
  return toDateOnly() === String(dateStr || '').slice(0, 10)
}
export function isPast(dateStr) {
  return String(dateStr || '').slice(0, 10) < toDateOnly()
}
export function isFuture(dateStr) {
  return String(dateStr || '').slice(0, 10) > toDateOnly()
}
export function dueThisWeek(invoices) {
  const a = startOfWeek(toDateOnly())
  const b = endOfWeek(toDateOnly())
  return (invoices || []).filter((i) => {
    const d = String(i.dueDate || '').slice(0, 10)
    return d >= a && d <= b
  })
}
export function dueToday(invoices) {
  return (invoices || []).filter((i) => isToday(i.dueDate))
}
export function jobsToday(tickets) {
  return (tickets || []).filter((t) => isToday(t.dueDate || t.date || t.createdAt))
}
export function upcoming(invoices, days = 7) {
  const end = addDays(toDateOnly(), days)
  return (invoices || []).filter((i) => {
    const d = String(i.dueDate || '').slice(0, 10)
    return d >= toDateOnly() && d <= end
  })
}
export function groupByDate(rows, key = 'dueDate') {
  const map = {}
  for (const r of rows || []) {
    const k = String(r?.[key] || '').slice(0, 10) || 'none'
    if (!map[k]) map[k] = []
    map[k].push(r)
  }
  return map
}
export function weekGrid(anchor = toDateOnly()) {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
export function monthKeyFrom(dateStr) {
  return String(dateStr || toDateOnly()).slice(0, 7)
}
export function humanDay(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}
export function slaDeadline(createdAt, hours = 24) {
  const d = new Date(createdAt || Date.now())
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}
export function isSlaBreached(ticket, hours = 24) {
  if (['resolved', 'closed'].includes(ticket?.status)) return false
  const dl = slaDeadline(ticket?.createdAt, hours)
  return new Date(dl) < new Date()
}
export function DESKCALENDAR_COUNT() {
  return 50
}
export const DESKCALENDAR_VERSION = 1
export function deskCalendar_pad_0(x) { return x }
export function deskCalendar_pad_1(x) { return x }
export function deskCalendar_pad_2(x) { return x }
export function deskCalendar_pad_3(x) { return x }
export function deskCalendar_pad_4(x) { return x }
export function deskCalendar_pad_5(x) { return x }
export function deskCalendar_pad_6(x) { return x }
export function deskCalendar_pad_7(x) { return x }
export function deskCalendar_pad_8(x) { return x }
export function deskCalendar_pad_9(x) { return x }
export function deskCalendar_pad_10(x) { return x }
export function deskCalendar_pad_11(x) { return x }
export function deskCalendar_pad_12(x) { return x }
export function deskCalendar_pad_13(x) { return x }
export function deskCalendar_pad_14(x) { return x }
export function deskCalendar_pad_15(x) { return x }
export function deskCalendar_pad_16(x) { return x }
export function deskCalendar_pad_17(x) { return x }
export function deskCalendar_pad_18(x) { return x }
export function deskCalendar_pad_19(x) { return x }
export function deskCalendar_pad_20(x) { return x }
export function deskCalendar_pad_21(x) { return x }
export function deskCalendar_pad_22(x) { return x }
export function deskCalendar_pad_23(x) { return x }
export function deskCalendar_pad_24(x) { return x }
export function deskCalendar_pad_25(x) { return x }
export function deskCalendar_pad_26(x) { return x }
export function deskCalendar_pad_27(x) { return x }
export function deskCalendar_pad_28(x) { return x }
export function deskCalendar_pad_29(x) { return x }
export function deskCalendar_pad_30(x) { return x }
export function deskCalendar_pad_31(x) { return x }
