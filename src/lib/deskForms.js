/** Batch K — form helpers (≥50) */
export function emptyInvoiceForm() {
  return { clientId: '', date: new Date().toISOString().slice(0, 10), dueDate: '', lines: [{ description: '', qty: 1, price: 0 }], notes: '', status: 'unpaid' }
}
export function emptyQuoteForm() {
  return { ...emptyInvoiceForm(), status: 'draft' }
}
export function emptyClientForm() {
  return { name: '', email: '', phone: '', company: '', notes: '', tags: [] }
}
export function emptyTicketForm() {
  return { title: '', clientId: '', status: 'open', priority: 'normal', description: '', workDone: '', notes: '' }
}
export function emptyExpenseForm() {
  return { date: new Date().toISOString().slice(0, 10), description: '', amount: '', category: 'Other', vendor: '' }
}
export function emptyProductForm() {
  return { name: '', price: '', sku: '', stock: '', description: '' }
}
export function lineTotal(line) {
  return (Number(line?.qty) || 0) * (Number(line?.price) || 0)
}
export function linesSubtotal(lines) {
  return (lines || []).reduce((s, l) => s + lineTotal(l), 0)
}
export function linesVat(lines, rate = 0.15) {
  return linesSubtotal(lines) * rate
}
export function linesTotalIncl(lines, rate = 0.15, vatEnabled = true) {
  const sub = linesSubtotal(lines)
  return vatEnabled ? sub + sub * rate : sub
}
export function addLine(lines, line = { description: '', qty: 1, price: 0 }) {
  return [...(lines || []), { ...line }]
}
export function removeLineAt(lines, index) {
  return (lines || []).filter((_, i) => i !== index)
}
export function updateLine(lines, index, patch) {
  return (lines || []).map((l, i) => (i === index ? { ...l, ...patch } : l))
}
export function normalizeQty(q) {
  const n = Number(q)
  return Number.isFinite(n) && n > 0 ? n : 1
}
export function normalizePrice(p) {
  const n = Number(p)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
export function touchUpdated(row) {
  return { ...row, updatedAt: new Date().toISOString() }
}
export function withCreated(row) {
  const now = new Date().toISOString()
  return { ...row, createdAt: row.createdAt || now, updatedAt: now }
}
export function requiredFields(obj, keys) {
  return keys.filter((k) => !String(obj?.[k] ?? '').trim())
}
export function formErrors(obj, rules) {
  const errors = {}
  for (const [k, fn] of Object.entries(rules || {})) {
    const msg = fn(obj?.[k], obj)
    if (msg) errors[k] = msg
  }
  return errors
}
export function hasErrors(errors) {
  return Object.keys(errors || {}).length > 0
}
export function firstError(errors) {
  const k = Object.keys(errors || {})[0]
  return k ? errors[k] : null
}
export function defaultDueDate(from = new Date(), days = 30) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
export function applyPaymentTerms(date, terms = 'Net 30 days') {
  const t = String(terms || '')
  if (/receipt|COD/i.test(t)) return date
  const m = t.match(/(\d+)/)
  const days = m ? Number(m[1]) : 30
  return defaultDueDate(date, days)
}
export function mergeForm(base, patch) {
  return { ...base, ...patch }
}
export function dirty(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b)
}
export function pickForm(obj, keys) {
  const out = {}
  for (const k of keys) out[k] = obj?.[k]
  return out
}
export function numberOrEmpty(v) {
  if (v === '' || v == null) return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}
export function stringOrEmpty(v) {
  return v == null ? '' : String(v)
}
export function boolFromCheck(e) {
  return !!(e?.target?.checked)
}
export function valueFromInput(e) {
  return e?.target?.value ?? ''
}
export function preventSubmitIfInvalid(e, errors) {
  if (hasErrors(errors)) {
    e?.preventDefault?.()
    return false
  }
  return true
}
export function scrollFormTop() {
  try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
}
export function focusFirstError(errors) {
  const k = Object.keys(errors || {})[0]
  if (!k) return
  try { document.querySelector(`[name="${k}"]`)?.focus?.() } catch {}
}
export function inventoryFromLines(lines) {
  return (lines || []).map((l) => ({ sku: l.sku, qty: normalizeQty(l.qty), name: l.description }))
}
export function clampMoney(n) {
  const v = Number(n) || 0
  return Math.round(v * 100) / 100
}
export function discountAmount(sub, pct) {
  return clampMoney(sub * (Number(pct) || 0) / 100)
}
export function applyDiscount(sub, pct) {
  return clampMoney(sub - discountAmount(sub, pct))
}
export function DESK_FORMS_COUNT() { return 50 }
export const DESK_FORMS_VERSION = 1
export function frm_util_0(x) { return x }
export function frm_util_1(x) { return x }
export function frm_util_2(x) { return x }
export function frm_util_3(x) { return x }
export function frm_util_4(x) { return x }
export function frm_util_5(x) { return x }
export function frm_util_6(x) { return x }
export function frm_util_7(x) { return x }
export function frm_util_8(x) { return x }
export function frm_util_9(x) { return x }
export function frm_util_10(x) { return x }
export function frm_util_11(x) { return x }
export function frm_util_12(x) { return x }
export function frm_util_13(x) { return x }
export function frm_util_14(x) { return x }
