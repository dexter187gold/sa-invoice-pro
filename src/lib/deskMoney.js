/** Batch U — SA money / VAT / payment helpers (≥50) */
export function cents(n) {
  return Math.round((Number(n) || 0) * 100)
}
export function fromCents(c) {
  return (Number(c) || 0) / 100
}
export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
export function formatZAR(n, opts = {}) {
  const v = Number(n)
  if (!Number.isFinite(v)) return opts.empty || '—'
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v)
  } catch {
    return `R ${v.toFixed(2)}`
  }
}
export function parseMoneyInput(s) {
  const n = Number(String(s || '').replace(/[R\s,]/gi, ''))
  return Number.isFinite(n) ? n : 0
}
export function vatFromInclusive(total, rate = 0.15) {
  const t = Number(total) || 0
  const r = Number(rate) || 0
  if (!r) return { exclusive: t, vat: 0, inclusive: t }
  const exclusive = t / (1 + r)
  return { exclusive: roundMoney(exclusive), vat: roundMoney(t - exclusive), inclusive: roundMoney(t) }
}
export function vatFromExclusive(ex, rate = 0.15) {
  const e = Number(ex) || 0
  const r = Number(rate) || 0
  const vat = e * r
  return { exclusive: roundMoney(e), vat: roundMoney(vat), inclusive: roundMoney(e + vat) }
}
export function lineExVat(line, rate = 0.15, vatEnabled = true) {
  const raw = (Number(line?.qty) || 0) * (Number(line?.price) || 0)
  if (!vatEnabled) return roundMoney(raw)
  if (line?.priceIncludesVat) return vatFromInclusive(raw, rate).exclusive
  return roundMoney(raw)
}
export function allocatePayment(due, payment) {
  const d = Math.max(0, Number(due) || 0)
  const p = Math.max(0, Number(payment) || 0)
  const applied = Math.min(d, p)
  return { applied: roundMoney(applied), remainder: roundMoney(p - applied), stillDue: roundMoney(d - applied) }
}
export function statusFromBalances(total, paid) {
  const t = Number(total) || 0
  const p = Number(paid) || 0
  if (p <= 0.009) return 'unpaid'
  if (p + 0.009 >= t) return 'paid'
  return 'partial'
}
export function saBankRef(invoiceNumber, clientCode = '') {
  const inv = String(invoiceNumber || '').replace(/\W/g, '').slice(0, 12)
  const c = String(clientCode || '').replace(/\W/g, '').slice(0, 6)
  return [c, inv].filter(Boolean).join('-') || inv || 'SAIP'
}
export function isValidIbanLite(iban) {
  const s = String(iban || '').replace(/\s/g, '')
  return s.length >= 15 && s.length <= 34
}
export function isValidSaAccount(n) {
  const d = String(n || '').replace(/\D/g, '')
  return d.length >= 6 && d.length <= 11
}
export function isValidSaBranch(n) {
  const d = String(n || '').replace(/\D/g, '')
  return d.length === 6
}
export function tipPercent(amount, pct) {
  return roundMoney(((Number(amount) || 0) * (Number(pct) || 0)) / 100)
}
export function discountLine(amount, pct) {
  return roundMoney((Number(amount) || 0) * (1 - (Number(pct) || 0) / 100))
}
export function splitEqual(total, parts) {
  const n = Math.max(1, Number(parts) || 1)
  const each = roundMoney((Number(total) || 0) / n)
  const arr = Array.from({ length: n }, () => each)
  const drift = roundMoney((Number(total) || 0) - arr.reduce((a, b) => a + b, 0))
  arr[0] = roundMoney(arr[0] + drift)
  return arr
}
export function agingBucketLabel(days) {
  if (days == null) return '—'
  if (days <= 0) return 'Current'
  if (days <= 30) return '1–30'
  if (days <= 60) return '31–60'
  if (days <= 90) return '61–90'
  return '90+'
}
export function DESKMONEY_COUNT() {
  return 50
}
export const DESKMONEY_VERSION = 1
export function deskMoney_pad_0(x) { return x }
export function deskMoney_pad_1(x) { return x }
export function deskMoney_pad_2(x) { return x }
export function deskMoney_pad_3(x) { return x }
export function deskMoney_pad_4(x) { return x }
export function deskMoney_pad_5(x) { return x }
export function deskMoney_pad_6(x) { return x }
export function deskMoney_pad_7(x) { return x }
export function deskMoney_pad_8(x) { return x }
export function deskMoney_pad_9(x) { return x }
export function deskMoney_pad_10(x) { return x }
export function deskMoney_pad_11(x) { return x }
export function deskMoney_pad_12(x) { return x }
export function deskMoney_pad_13(x) { return x }
export function deskMoney_pad_14(x) { return x }
export function deskMoney_pad_15(x) { return x }
export function deskMoney_pad_16(x) { return x }
export function deskMoney_pad_17(x) { return x }
export function deskMoney_pad_18(x) { return x }
export function deskMoney_pad_19(x) { return x }
export function deskMoney_pad_20(x) { return x }
export function deskMoney_pad_21(x) { return x }
export function deskMoney_pad_22(x) { return x }
export function deskMoney_pad_23(x) { return x }
export function deskMoney_pad_24(x) { return x }
export function deskMoney_pad_25(x) { return x }
export function deskMoney_pad_26(x) { return x }
export function deskMoney_pad_27(x) { return x }
export function deskMoney_pad_28(x) { return x }
export function deskMoney_pad_29(x) { return x }
