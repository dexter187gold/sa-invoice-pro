/**
 * Bank CSV import + match to open invoices (FNB / Standard / ABSA / Nedbank-ish).
 */
import * as db from './db'
import { STORES } from './db'
import { recordPayment } from './payments'

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
  for (let i = 0; i < Math.min(5, matrix.length); i++) {
    const nums = matrix[i].filter((c) => /^-?[\d\s,.]+$/.test(c) && /\d/.test(c)).length
    if (nums < matrix[i].length / 2) {
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
  let t = String(s).replace(/\s/g, '').replace(/R/gi, '')
  if (/\d,\d{2}$/.test(t) && !t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(/,/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function parseDate(s) {
  if (!s) return null
  const t = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

export function normalizeBankRows({ headers, rows }) {
  const iDate = findCol(headers, ['date', 'trans date', 'transaction date', 'posting date', 'value date'])
  const iDesc = findCol(headers, ['description', 'narrative', 'particulars', 'details', 'transaction'])
  const iRef = findCol(headers, ['reference', 'ref', 'cheque', 'stmt'])
  const iAmount = findCol(headers, ['amount', 'value', 'transaction amount'])
  const iCredit = findCol(headers, ['credit', 'deposit', 'money in', 'cr'])
  const iDebit = findCol(headers, ['debit', 'withdrawal', 'money out', 'dr'])

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

export function scoreMatch(txn, inv, client) {
  if (!txn?.isCredit || !(txn.amount > 0)) return 0
  const due = Number(inv.amountDue ?? inv.total) || 0
  if (due <= 0) return 0
  let score = 0
  const amtDiff = Math.abs(txn.amount - due)
  if (amtDiff < 0.02) score += 50
  else if (amtDiff < 1) score += 35
  else if (amtDiff < due * 0.05) score += 20
  else if (txn.amount > due * 1.05) return 0

  const hay = `${txn.description} ${txn.reference}`.toLowerCase()
  const num = String(inv.number || '').toLowerCase()
  if (num && hay.includes(num)) score += 40
  if (num) {
    const tail = num.replace(/[^0-9]/g, '').slice(-4)
    if (tail && hay.includes(tail)) score += 15
  }
  const name = String(client?.name || '').toLowerCase()
  if (name && name.length > 2) {
    const parts = name.split(/\s+/).filter((p) => p.length > 2)
    for (const p of parts) {
      if (hay.includes(p)) score += 10
    }
  }
  const phone = String(client?.phone || client?.whatsapp || '').replace(/\D/g, '')
  if (phone.length >= 7 && hay.includes(phone.slice(-7))) score += 10
  return score
}

export function matchBankToInvoices(txns, invoices, clients) {
  const open = (invoices || []).filter(
    (i) => !i.isCredit && ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')
  )
  const used = new Set()
  const results = []
  const credits = (txns || []).filter((t) => t.isCredit && t.amount > 0)

  for (const txn of credits) {
    let best = null
    let bestScore = 0
    for (const inv of open) {
      if (used.has(String(inv.id))) continue
      const client = (clients || []).find((c) => String(c.id) === String(inv.clientId))
      const s = scoreMatch(txn, inv, client)
      if (s > bestScore) {
        bestScore = s
        best = { inv, client }
      }
    }
    const suggested = bestScore >= 40
    if (suggested && best) used.add(String(best.inv.id))
    results.push({
      txn,
      invoice: best?.inv || null,
      client: best?.client || null,
      score: bestScore,
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
