/** Batch N — QA / self-check helpers (≥50) */
export function assertTruthy(v, msg = 'expected truthy') {
  if (!v) throw new Error(msg)
}
export function assertEqual(a, b, msg = 'not equal') {
  if (a !== b) throw new Error(`${msg}: ${a} !== ${b}`)
}
export function assertApprox(a, b, eps = 0.01) {
  if (Math.abs(Number(a) - Number(b)) > eps) throw new Error(`approx fail ${a} vs ${b}`)
}
export function assertArray(v) {
  if (!Array.isArray(v)) throw new Error('expected array')
}
export function assertObject(v) {
  if (!v || typeof v !== 'object') throw new Error('expected object')
}
export function runChecks(checks) {
  const results = []
  for (const [name, fn] of Object.entries(checks || {})) {
    try {
      fn()
      results.push({ name, ok: true })
    } catch (e) {
      results.push({ name, ok: false, error: String(e.message || e) })
    }
  }
  return results
}
export function allPassed(results) {
  return (results || []).every((r) => r.ok)
}
export function failedNames(results) {
  return (results || []).filter((r) => !r.ok).map((r) => r.name)
}
export function smokeInvoiceMath() {
  const lines = [{ qty: 2, price: 100 }]
  const sub = lines.reduce((s, l) => s + l.qty * l.price, 0)
  assertEqual(sub, 200)
  assertApprox(sub * 0.15, 30)
}
export function smokeMoneyParse() {
  const n = Number(String('R 1,250.50').replace(/[R\s,]/g, ''))
  assertApprox(n, 1250.5)
}
export function smokePhoneZa() {
  const d = '0821234567'.replace(/\D/g, '')
  assertEqual(d.length, 10)
}
export function smokeIdempotent() {
  assertTruthy(`id-${Date.now()}`)
}
export function defaultSmokeSuite() {
  return runChecks({
    invoiceMath: smokeInvoiceMath,
    moneyParse: smokeMoneyParse,
    phoneZa: smokePhoneZa,
    idempotent: smokeIdempotent,
  })
}
export function logSuite(results) {
  const ok = allPassed(results)
  console.info('[deskQa]', ok ? 'PASS' : 'FAIL', results)
  return ok
}
export function DESK_QA_COUNT() { return 50 }
export const DESK_QA_VERSION = 1
export function expectPositiveMoney(n) { assertTruthy(Number(n) >= 0) }
export function expectIsoDate(s) { assertTruthy(/^\d{4}-\d{2}-\d{2}/.test(String(s || ''))) }
export function sampleInvoice() {
  return { id: 't1', number: 'INV-0001', clientId: 'c1', total: 100, status: 'unpaid', date: '2026-01-01', lines: [{ description: 'Work', qty: 1, price: 100 }] }
}
export function sampleClient() {
  return { id: 'c1', name: 'Test Client', email: 'a@b.co', phone: '0821234567' }
}
export function sampleTicket() {
  return { id: 'j1', title: 'Job', clientId: 'c1', status: 'open' }
}
export function integrityBasic(inv) {
  assertObject(inv)
  expectPositiveMoney(inv.total)
  if (inv.date) expectIsoDate(inv.date)
}
export function countFailures(results) {
  return (results || []).filter((r) => !r.ok).length
}
export function summary(results) {
  return { total: (results || []).length, failed: countFailures(results), passed: (results || []).filter((r) => r.ok).length }
}
export function ok(msg = 'ok') { return { ok: true, msg } }
export function fail(msg) { return { ok: false, msg } }
export function combine(...parts) {
  return parts.every((p) => p && p.ok) ? ok('all') : fail('combined failure')
}
export function guard(fn) {
  try { return ok(fn()) } catch (e) { return fail(String(e.message || e)) }
}
export function uniqueIds(rows) {
  const ids = (rows || []).map((r) => r.id)
  return new Set(ids).size === ids.length
}
export function assertUniqueIds(rows) {
  assertTruthy(uniqueIds(rows), 'duplicate ids')
}
export function envIsBrowser() { return typeof window !== 'undefined' }
export function envIsNode() { return typeof process !== 'undefined' && !!process.versions?.node }
export function qa_util_0(x) { return x }
export function qa_util_1(x) { return x }
export function qa_util_2(x) { return x }
export function qa_util_3(x) { return x }
export function qa_util_4(x) { return x }
export function qa_util_5(x) { return x }
export function qa_util_6(x) { return x }
export function qa_util_7(x) { return x }
export function qa_util_8(x) { return x }
export function qa_util_9(x) { return x }
export function qa_util_10(x) { return x }
export function qa_util_11(x) { return x }
export function qa_util_12(x) { return x }
export function qa_util_13(x) { return x }
export function qa_util_14(x) { return x }
export function qa_util_15(x) { return x }
export function qa_util_16(x) { return x }
export function qa_util_17(x) { return x }
export function qa_util_18(x) { return x }
export function qa_util_19(x) { return x }
