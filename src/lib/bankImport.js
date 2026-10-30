/**
 * Bank CSV import + match to open invoices (FNB / Standard / ABSA / Nedbank / Capitec / Discovery-ish).
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { recordPayment } from './payments.js'

export function parseBankCsv(text) {
  const raw = String(text || '').replace(/^\ufeff/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const sample = lines.slice(0, 5).join('\n')
  const delim = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ','
  const parseLine = (line) => {
    const cells = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === delim) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return cells
  }
  const matrix = lines.map(parseLine)
  let headerIdx = 0
  for (let i = 0; i < Math.min(8, matrix.length); i++) {
    const row = matrix[i]
    const joined = row.join(' ').toLowerCase()
    if (/statement|account number|opening balance|closing balance|period from/i.test(joined) && !/date/i.test(joined)) continue
    const nums = row.filter((c) => /^-?[\d\s,.]+$/.test(c) && /\d/.test(c)).length
    if (nums < row.length / 2) { headerIdx = i; break }
  }
  const headers = matrix[headerIdx].map((h) => h.toLowerCase())
  const rows = matrix.slice(headerIdx + 1).filter((r) => r.some((c) => c))
  return { headers, rows, delim }
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.findIndex((raw) => {
      const h = String(raw || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (c.length <= 3) return h.split(/\s+/).includes(c)
      return h.includes(c)
    })
    if (i >= 0) return i
  }
  return -1
}

function parseAmount(s) {
  if (s == null || s === '') return null
  let t = String(s).trim()
  if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1) }
  if (/\bDR\b/i.test(t) || /-$/.test(t)) neg = true
  if (/\bCR\b/i.test(t)) neg = false
  t = t.replace(/\s/g, '').replace(/R/gi, '').replace(/ZAR/gi, '').replace(/DR|CR/gi, '')
  if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(/,/g, '')
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return neg ? -Math.abs(n) : n
}

function parseDate(s) {
  if (!s) return null
  const t = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = '20' + y
    return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0')
  }
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

export function normalizeBankRows({ headers, rows }) {
  const iDate = findCol(headers, ['date', 'trans date', 'transaction date', 'posting date', 'value date', 'txn date', 'effective date'])
  const iDesc = findCol(headers, ['description', 'narrative', 'particulars', 'details', 'transaction', 'description 1', 'memo', 'payee', 'beneficiary'])
  const iRef = findCol(headers, ['reference', 'ref', 'cheque', 'stmt', 'beneficiary reference', 'your reference', 'bank reference'])
  const iAmount = findCol(headers, ['amount', 'value', 'transaction amount', 'txn amount', 'trand amount'])
  const iCredit = findCol(headers, ['credit', 'deposit', 'money in', 'cr', 'credit amount', 'paid in', 'receipts', 'credits', 'money in (r)'])
  const iDebit = findCol(headers, ['debit', 'withdrawal', 'money out', 'dr', 'debit amount', 'paid out', 'payments', 'debits', 'money out (r)', 'charge'])
  const iType = findCol(headers, ['type', 'dr/cr', 'd/c', 'transaction type', 'trn type', 'c/d'])
  const iBalance = findCol(headers, ['balance', 'running balance', 'available balance', 'ledger balance'])
  const out = []
  let prevBalance = null
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri]
    const date = parseDate(iDate >= 0 ? r[iDate] : r[0])
    const description = (iDesc >= 0 ? r[iDesc] : r[1] || '') || ''
    const reference = (iRef >= 0 ? r[iRef] : '') || ''
    const typeRaw = iType >= 0 ? String(r[iType] || '').toLowerCase() : ''
    let amount = null
    if (iCredit >= 0 || iDebit >= 0) {
      const cr = iCredit >= 0 ? parseAmount(r[iCredit]) : null
      const dr = iDebit >= 0 ? parseAmount(r[iDebit]) : null
      const crAbs = cr != null ? Math.abs(cr) : 0
      const drAbs = dr != null ? Math.abs(dr) : 0
      if (crAbs > 0 && drAbs === 0) amount = crAbs
      else if (drAbs > 0 && crAbs === 0) amount = -drAbs
      else if (crAbs > 0 && drAbs > 0) amount = crAbs >= drAbs ? crAbs : -drAbs
    } else if (iAmount >= 0) {
      amount = parseAmount(r[iAmount])
      if (amount != null && amount > 0 && typeRaw) {
        if (/^(dr|d|debit|withdrawal|payment|out)/i.test(typeRaw)) amount = -Math.abs(amount)
        else if (/^(cr|c|credit|deposit|receipt|in)/i.test(typeRaw)) amount = Math.abs(amount)
      }
    } else {
      for (let c = r.length - 1; c >= 0; c--) {
        if (c === iBalance || c === iDate) continue
        const n = parseAmount(r[c])
        if (n != null && n !== 0) { amount = n; break }
      }
    }
    if (amount != null && amount > 0 && iBalance >= 0 && typeRaw === '') {
      const bal = parseAmount(r[iBalance])
      if (bal != null && prevBalance != null) {
        const delta = bal - prevBalance
        if (delta < -0.005 && Math.abs(Math.abs(delta) - Math.abs(amount)) < 0.05) amount = -Math.abs(amount)
      }
      if (bal != null) prevBalance = bal
    } else if (iBalance >= 0) {
      const bal = parseAmount(r[iBalance])
      if (bal != null) prevBalance = bal
    }
    if (amount == null || amount === 0 || !date) continue
    out.push({
      id: 'bank-' + date + '-' + ri + '-' + Math.abs(amount),
      date, amount,
      description: String(description).slice(0, 200),
      reference: String(reference).slice(0, 80),
      isCredit: amount > 0,
      direction: amount > 0 ? 'in' : 'out',
    })
  }
  return out
}

/** Prefer first brand token so ENGEN MIDRAND and Engen Sandton share a group. */
export function normalizeDescriptionKey(desc) {
  const cleaned = String(desc || '')
    .toLowerCase()
    .replace(/\b\d{2,}[-\/]?\d*\b/g, ' ')
    .replace(/\b(inv|invoice|ref|eft|pos|purchase|payment|card|debit|credit|fnb|absa|nedbank|standard|capitec)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 'other'
  const tokens = cleaned.split(/\s+/).filter((w) => w.length > 2)
  if (tokens.length >= 1) return tokens[0].slice(0, 24)
  return cleaned.slice(0, 48)
}

export function groupBankTxnsByDescription(txns = []) {
  const map = new Map()
  for (const t of txns) {
    const key = normalizeDescriptionKey(t.description)
    if (!map.has(key)) {
      map.set(key, { key, label: String(t.description || key).slice(0, 80), direction: Number(t.amount) >= 0 ? 'in' : 'out', items: [], totalIn: 0, totalOut: 0, count: 0 })
    }
    const g = map.get(key)
    g.items.push(t)
    g.count++
    const amt = Number(t.amount) || 0
    if (amt >= 0) g.totalIn += amt
    else g.totalOut += Math.abs(amt)
    if (g.totalOut > g.totalIn) g.direction = 'out'
    else if (g.totalIn > g.totalOut) g.direction = 'in'
  }
  return [...map.values()].sort((a, b) => b.count - a.count || (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut))
}

export async function createMissingEntriesFromGroups(groups = [], existingExpenses = [], opts = {}) {
  const { categoryFor = () => '6900' } = opts
  const fingerprints = new Set((existingExpenses || []).map((e) => String(e.date || '').slice(0, 10) + '|' + (Number(e.amount) || 0) + '|' + normalizeDescriptionKey(e.description)))
  const created = []
  for (const g of groups) {
    if (g.direction !== 'out' && !(g.totalOut > 0)) continue
    for (const t of g.items) {
      const amt = Math.abs(Number(t.amount) || 0)
      if (!(amt > 0) || Number(t.amount) > 0) continue
      const fp = String(t.date || '').slice(0, 10) + '|' + amt + '|' + normalizeDescriptionKey(t.description)
      if (fingerprints.has(fp)) continue
      fingerprints.add(fp)
      const row = { date: String(t.date || '').slice(0, 10), amount: amt, description: String(t.description || g.label || 'Bank debit').slice(0, 200), category: categoryFor(t), vendor: String(t.description || '').slice(0, 80), reference: t.reference || '', source: 'bank-import', bankTxnId: t.id, createdAt: new Date().toISOString() }
      created.push(await db.add(STORES.expenses, row))
    }
  }
  return { created: created.length, rows: created }
}

function daysBetween(a, b) {
  try {
    const da = new Date(String(a).slice(0, 10) + 'T12:00:00').getTime()
    const db_ = new Date(String(b).slice(0, 10) + 'T12:00:00').getTime()
    return Math.abs(Math.round((da - db_) / 86400000))
  } catch { return 999 }
}

export function matchBankToInvoices(txns = [], invoices = [], clients = []) {
  const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'))
  const clientName = (id) => clients.find((c) => String(c.id) === String(id))?.name || ''
  return txns.map((txn) => {
    if (!(Number(txn.amount) > 0)) return { txn, invoice: null, score: 0, reasons: ['Debit — not matched to invoices'], suggested: false }
    let best = null, bestScore = 0, reasons = []
    for (const inv of open) {
      const due = Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0
      if (due <= 0) continue
      let score = 0
      const rs = []
      const amt = Number(txn.amount) || 0
      if (Math.abs(amt - due) < 0.05) { score += 50; rs.push('Exact amount') }
      else if (Math.abs(amt - due) / Math.max(due, 1) < 0.02) { score += 35; rs.push('Amount close') }
      const d = daysBetween(txn.date, inv.dueDate || inv.date)
      if (d <= 3) { score += 20; rs.push('Date near due') }
      else if (d <= 14) { score += 10; rs.push('Date within 2 weeks') }
      const desc = String(txn.description || '').toLowerCase()
      const ref = String(txn.reference || '').toLowerCase()
      const num = String(inv.number || '').toLowerCase()
      const name = String(clientName(inv.clientId) || '').toLowerCase()
      if (num && (desc.includes(num) || ref.includes(num))) { score += 25; rs.push('Invoice number in description') }
      if (name && name.length > 3 && desc.includes(name.slice(0, Math.min(12, name.length)))) { score += 15; rs.push('Client name hinted') }
      if (score > bestScore) { bestScore = score; best = inv; reasons = rs }
    }
    return { txn, invoice: bestScore >= 40 ? best : null, score: bestScore, reasons, suggested: bestScore >= 40 }
  })
}

export async function applyBankMatch(txn, invoice, opts = {}) {
  if (!invoice) throw new Error('No invoice selected')
  const amount = Number(opts.amount != null ? opts.amount : txn.amount) || 0
  if (!(amount > 0)) throw new Error('Payment amount must be positive')
  return recordPayment({ invoiceId: invoice.id, amount, date: txn.date || new Date().toISOString().slice(0, 10), method: opts.method || 'EFT', reference: txn.reference || txn.description || '', notes: opts.notes || ('Bank statement · ' + (txn.description || '')).trim() })
}

export function txnFingerprint(t) {
  return [String(t?.date || '').slice(0, 10), Number(t?.amount || 0).toFixed(2), String(t?.description || '').trim().toLowerCase().replace(/\s+/g, ' '), String(t?.reference || '').trim().toLowerCase()].join('|')
}
export function softFingerprint(t) {
  return [String(t?.date || '').slice(0, 10), Number(t?.amount || 0).toFixed(2)].join('|')
}
function normDesc(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80) }
function descSimilar(a, b) {
  const x = normDesc(a), y = normDesc(b)
  if (!x || !y) return false
  if (x === y || x.includes(y) || y.includes(x)) return true
  const xs = new Set(x.split(/\s+/).filter((w) => w.length > 2))
  const ys = y.split(/\s+/).filter((w) => w.length > 2)
  if (!ys.length) return false
  let hit = 0
  for (const w of ys) if (xs.has(w)) hit++
  return hit / ys.length >= 0.55
}

export function compareImportBatch(incoming = [], existing = []) {
  const byExact = new Map(), bySoft = new Map()
  for (const e of existing || []) {
    const fp = txnFingerprint(e), soft = softFingerprint(e)
    if (!byExact.has(fp)) byExact.set(fp, [])
    byExact.get(fp).push(e)
    if (!bySoft.has(soft)) bySoft.set(soft, [])
    bySoft.get(soft).push(e)
  }
  const rows = []
  for (const txn of incoming || []) {
    const fp = txnFingerprint(txn), soft = softFingerprint(txn)
    const exactHits = byExact.get(fp) || []
    if (exactHits.length) { rows.push({ txn, status: 'exact_duplicate', action: 'skip', existing: exactHits[0], message: 'Duplicate found — same date, amount and description already in books.', options: ['skip', 'import_anyway'] }); continue }
    const sameDay = (existing || []).filter((e) => String(e.date || '').slice(0, 10) === String(txn.date || '').slice(0, 10) && descSimilar(e.description, txn.description))
    const amountDiff = sameDay.filter((e) => Number(e.amount).toFixed(2) !== Number(txn.amount).toFixed(2))
    if (amountDiff.length) { rows.push({ txn, status: 'amount_mismatch', action: 'review', existing: amountDiff[0], message: 'Amount may be incorrect — existing ' + Number(amountDiff[0].amount).toFixed(2) + ' vs statement ' + Number(txn.amount).toFixed(2) + '.', options: ['skip', 'import_as_new', 'use_existing_amount', 'fix_amount'] }); continue }
    const softHits = bySoft.get(soft) || []
    if (softHits.length) { rows.push({ txn, status: 'same_date_amount', action: 'review', existing: softHits[0], message: 'Same date and amount already exist (description differs). Possible duplicate.', options: ['skip', 'import_as_new', 'update_description'] }); continue }
    rows.push({ txn, status: 'new', action: 'import', existing: null, message: 'New line — will be added when you save.', options: ['import', 'skip'] })
  }
  return { rows, summary: { total: rows.length, neu: rows.filter((r) => r.status === 'new').length, exact: rows.filter((r) => r.status === 'exact_duplicate').length, soft: rows.filter((r) => r.status === 'same_date_amount').length, amount: rows.filter((r) => r.status === 'amount_mismatch').length } }
}

export function planImportWrites(decisionRows = []) {
  const toAdd = [], toUpdate = [], skipped = []
  for (const row of decisionRows) {
    const action = row.action || (row.status === 'new' ? 'import' : 'skip')
    const txn = { ...row.txn }
    if (action === 'skip' || action === 'use_existing_amount') { skipped.push(row); continue }
    if (action === 'import' || action === 'import_as_new' || action === 'import_anyway' || action === 'fix_amount') {
      toAdd.push({ ...txn, amount: Number(txn.amount) || 0, date: String(txn.date || '').slice(0, 10), description: String(txn.description || '').slice(0, 200), reference: String(txn.reference || '').slice(0, 80), direction: Number(txn.amount) >= 0 ? 'in' : 'out', reconciled: false, source: 'statement-import', amountCorrected: action === 'fix_amount' || undefined })
      continue
    }
    if (action === 'update_description' && row.existing) {
      toUpdate.push({ ...row.existing, description: String(txn.description || row.existing.description || '').slice(0, 200), reference: txn.reference || row.existing.reference, statementNote: 'Description updated from statement import', updatedAt: new Date().toISOString() })
      continue
    }
    skipped.push(row)
  }
  return { toAdd, toUpdate, skipped }
}

export async function commitImportPlan(plan, meta = {}) {
  let added = 0, updated = 0
  for (const row of plan.toAdd || []) {
    await db.add(STORES.bankTxns, { ...row, accountLabel: meta.accountLabel || 'Company bank account', statementName: meta.statementName || 'Bank statement', importedAt: new Date().toISOString(), bookkeepingStatus: 'needs-review' })
    added++
  }
  for (const row of plan.toUpdate || []) { await db.put(STORES.bankTxns, row); updated++ }
  return { added, updated, skipped: (plan.skipped || []).length }
}

export function bankTxnFingerprint(t) { return txnFingerprint(t) }
export function explainMatchScore(txn, inv, client) {
  const matches = matchBankToInvoices([txn], [inv], client ? [client] : [])
  const m = matches[0] || { score: 0, reasons: [] }
  return { score: m.score || 0, reasons: m.reasons || [] }
}
export function findBankTxnForMatch(txn, existing = []) {
  const fp = txnFingerprint(txn)
  for (const row of existing || []) {
    if (txnFingerprint(row) === fp) return { row, alreadyApplied: !!(row.matchedInvoiceId || row.paymentId || row.reconciled) }
  }
  return { row: null, alreadyApplied: false }
}
