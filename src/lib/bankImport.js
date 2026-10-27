/**
 * Bank CSV import + match to open invoices (FNB / Standard / ABSA / Nedbank / Capitec / Discovery-ish).
 */
import * as db from './db.js'
import { STORES } from './db.js'
import { recordPayment } from './payments.js'

/** Detect delimiter and parse a simple CSV into rows of cells. */
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
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === delim) {
        cells.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    cells.push(cur.trim())
    return cells
  }

  const matrix = lines.map(parseLine)
  let headerIdx = 0
  for (let i = 0; i < Math.min(8, matrix.length); i++) {
    const row = matrix[i]
    const joined = row.join(' ').toLowerCase()
    // Skip bank statement title rows
    if (/statement|account number|opening balance|closing balance|period from/i.test(joined) && !/date/i.test(joined)) continue
    const nums = row.filter((c) => /^-?[\d\s,.]+$/.test(c) && /\d/.test(c)).length
    if (nums < row.length / 2) {
      headerIdx = i
      break
    }
  }
  const headers = matrix[headerIdx].map((h) => h.toLowerCase())
  const rows = matrix.slice(headerIdx + 1).filter((r) => r.some((c) => c))
  return { headers, rows, delim }
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.includes(c))
    if (i >= 0) return i
  }
  return -1
}

function parseAmount(s) {
  if (s == null || s === '') return null
  let t = String(s).replace(/\s/g, '').replace(/R/gi, '').replace(/ZAR/gi, '')
  // SA style 1.234,56 → 1234.56
  if (/\d\.\d{3},\d{2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.')
  else if (/\d,\d{2}$/.test(t) && !t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(/,/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function parseDate(s) {
  if (!s) return null
  const t = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY (ZA)
  const m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = `20${y}`
    // Prefer DMY for SA banks
    const day = m[1].padStart(2, '0')
    const mon = m[2].padStart(2, '0')
    return `${y}-${mon}-${day}`
  }
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

export function normalizeBankRows({ headers, rows }) {
  const iDate = findCol(headers, [
    'date', 'trans date', 'transaction date', 'posting date', 'value date', 'txn date', 'effective date',
  ])
  const iDesc = findCol(headers, [
    'description', 'narrative', 'particulars', 'details', 'transaction', 'description 1', 'memo', 'payee',
  ])
  const iRef = findCol(headers, ['reference', 'ref', 'cheque', 'stmt', 'beneficiary reference', 'your reference'])
  const iAmount = findCol(headers, ['amount', 'value', 'transaction amount', 'txn amount'])
  const iCredit = findCol(headers, ['credit', 'deposit', 'money in', 'cr', 'credit amount', 'paid in'])
  const iDebit = findCol(headers, ['debit', 'withdrawal', 'money out', 'dr', 'debit amount', 'paid out'])

  const out = []
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri]
    const date = parseDate(iDate >= 0 ? r[iDate] : r[0])
    const description = (iDesc >= 0 ? r[iDesc] : r[1] || '') || ''
    const reference = (iRef >= 0 ? r[iRef] : '') || ''

    let amount = null
    if (iCredit >= 0 || iDebit >= 0) {
      const cr = iCredit >= 0 ? parseAmount(r[iCredit]) : null
      const dr = iDebit >= 0 ? parseAmount(r[iDebit]) : null
      if (cr && cr > 0) amount = cr
      else if (dr && dr > 0) amount = -dr
    } else if (iAmount >= 0) {
      amount = parseAmount(r[iAmount])
    } else {
      for (let c = r.length - 1; c >= 0; c--) {
        const n = parseAmount(r[c])
        if (n != null) {
          amount = n
          break
        }
      }
    }
    if (amount == null || !date) continue
    out.push({
      id: `bank-${date}-${ri}-${Math.abs(amount)}`,
      date,
      amount,
      description: String(description).slice(0, 200),
      reference: String(reference).slice(0, 80),
      isCredit: amount > 0,
    })
  }
  return out
}

function daysBetween(a, b) {
  try {
    const da = new Date(String(a).slice(0, 10) + 'T12:00:00').getTime()
    const db = new Date(String(b).slice(0, 10) + 'T12:00:00').getTime()
    if (!Number.isFinite(da) || !Number.isFinite(db)) return null
    return Math.abs(da - db) / 86400000
  } catch {
    return null
  }
}

/** Explain why a score was awarded (for bank match UX tooltips). */
export function explainMatchScore(txn, inv, client) {
  const reasons = []
  if (!txn?.isCredit || !(txn.amount > 0)) return { score: 0, reasons: ['Not a credit'] }
  const due = Number(inv.amountDue ?? inv.total) || 0
  if (due <= 0) return { score: 0, reasons: ['Invoice has no balance'] }

  let score = 0
  const amtDiff = Math.abs(txn.amount - due)
  if (amtDiff < 0.02) {
    score += 50
    reasons.push('Exact amount')
  } else if (amtDiff < 1) {
    score += 38
    reasons.push('Amount within R1')
  } else if (amtDiff < due * 0.03) {
    score += 25
    reasons.push('Amount within 3%')
  } else if (amtDiff < due * 0.08) {
    score += 12
    reasons.push('Amount close')
  } else if (txn.amount > due * 1.08) {
    return { score: 0, reasons: ['Payment larger than balance'] }
  }

  const hay = `${txn.description} ${txn.reference}`.toLowerCase()
  const num = String(inv.number || '').toLowerCase()
  if (num && hay.includes(num)) {
    score += 40
    reasons.push('Invoice number in description')
  } else if (num) {
    const digits = num.replace(/[^0-9]/g, '')
    const tail = digits.slice(-4)
    if (tail && hay.includes(tail)) {
      score += 18
      reasons.push('Invoice number tail')
    }
    // Partial like INV-26 or 2026-0001
    const parts = num.split(/[-_/]/).filter((p) => p.length >= 3)
    for (const p of parts) {
      if (hay.includes(p.toLowerCase())) {
        score += 8
        reasons.push('Invoice fragment')
        break
      }
    }
  }

  const name = String(client?.name || '').toLowerCase()
  if (name && name.length > 2) {
    const parts = name.split(/\s+/).filter((p) => p.length > 2)
    let hits = 0
    for (const p of parts) {
      if (hay.includes(p)) {
        score += 10
        hits++
      }
    }
    if (hits) reasons.push(`Client name token${hits > 1 ? 's' : ''}`)
  }
  const phone = String(client?.phone || client?.whatsapp || '').replace(/\D/g, '')
  if (phone.length >= 7 && hay.includes(phone.slice(-7))) {
    score += 12
    reasons.push('Phone match')
  }

  // Date proximity: payment near invoice date or due date
  const invDate = inv.date || inv.issueDate
  const dueDate = inv.dueDate
  const d1 = daysBetween(txn.date, invDate)
  const d2 = daysBetween(txn.date, dueDate)
  const bestDays = [d1, d2].filter((x) => x != null).sort((a, b) => a - b)[0]
  if (bestDays != null) {
    if (bestDays <= 3) {
      score += 12
      reasons.push('Within 3 days of inv/due')
    } else if (bestDays <= 14) {
      score += 6
      reasons.push('Within 2 weeks of inv/due')
    } else if (bestDays > 90) {
      score -= 8
      reasons.push('Date far from invoice')
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons: reasons.length ? reasons : ['Weak signals only'] }
}

export function scoreMatch(txn, inv, client) {
  return explainMatchScore(txn, inv, client).score
}

export function matchBankToInvoices(txns, invoices, clients) {
  const open = (invoices || []).filter(
    (i) => !i.isCredit && ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid'),
  )
  const used = new Set()
  const results = []
  const credits = (txns || []).filter((t) => t.isCredit && t.amount > 0)

  for (const txn of credits) {
    let best = null
    let bestScore = 0
    let bestReasons = []
    for (const inv of open) {
      if (used.has(String(inv.id))) continue
      const client = (clients || []).find((c) => String(c.id) === String(inv.clientId))
      const { score: s, reasons } = explainMatchScore(txn, inv, client)
      if (s > bestScore) {
        bestScore = s
        best = { inv, client }
        bestReasons = reasons
      }
    }
    const suggested = bestScore >= 40
    if (suggested && best) used.add(String(best.inv.id))
    results.push({
      txn,
      invoice: best?.inv || null,
      client: best?.client || null,
      score: bestScore,
      reasons: bestReasons,
      suggested,
    })
  }
  return results
}

export async function applyBankMatch({ txn, invoice, existingPayments }) {
  if (!txn || !invoice) throw new Error('Match requires txn and invoice')
  const amount = Math.min(Number(txn.amount) || 0, Number(invoice.amountDue ?? invoice.total) || 0)
  if (!(amount > 0)) throw new Error('Nothing to apply')

  const { payment } = await recordPayment({
    invoice,
    amount,
    method: 'EFT',
    date: txn.date,
    reference: txn.reference || txn.description?.slice(0, 60) || 'Bank import',
    existingPayments,
  })

  await db.add(STORES.bankTxns, {
    date: txn.date,
    amount: txn.amount,
    description: txn.description,
    reference: txn.reference,
    matchedInvoiceId: invoice.id,
    paymentId: payment?.id,
    importedAt: new Date().toISOString(),
  })

  return { payment, amount }
}
