/** SA Invoice Pro — accounting helpers (owner books) */

export const DEFAULT_COA = [
  { code: '1000', name: 'Bank / Cash', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '1300', name: 'VAT Input (claimable)', type: 'asset' },
  { code: '1500', name: 'Fixed Assets', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'VAT Output (payable)', type: 'liability' },
  { code: '2200', name: 'PAYE / Staff deductions', type: 'liability' },
  { code: '2300', name: 'Loan / Finance', type: 'liability' },
  { code: '3000', name: 'Owner Equity / Capital', type: 'equity' },
  { code: '3100', name: 'Retained Earnings', type: 'equity' },
  { code: '3200', name: 'Owner Drawings', type: 'equity' },
  { code: '4000', name: 'Sales / Service Revenue', type: 'income' },
  { code: '4100', name: 'Other Income', type: 'income' },
  { code: '4200', name: 'Interest Received', type: 'income' },
  { code: '5000', name: 'Cost of Sales / Materials', type: 'expense' },
  { code: '6100', name: 'Salaries & Wages', type: 'expense' },
  { code: '6200', name: 'Rent & Premises', type: 'expense' },
  { code: '6300', name: 'Fuel & Travel', type: 'expense' },
  { code: '6400', name: 'Utilities & Communications', type: 'expense' },
  { code: '6500', name: 'Marketing & Advertising', type: 'expense' },
  { code: '6600', name: 'Insurance', type: 'expense' },
  { code: '6700', name: 'Bank Charges & Interest', type: 'expense' },
  { code: '6800', name: 'Professional Fees', type: 'expense' },
  { code: '6900', name: 'General & Admin Expenses', type: 'expense' },
]

export const JOURNAL_TEMPLATES = [
  { id: 'owner-draw', label: 'Owner drawings', debitCode: '3200', creditCode: '1000', memo: 'Owner drawings' },
  { id: 'owner-capital', label: 'Owner capital in', debitCode: '1000', creditCode: '3000', memo: 'Owner capital contribution' },
  { id: 'bank-charges', label: 'Bank charges', debitCode: '6700', creditCode: '1000', memo: 'Bank charges' },
  { id: 'rent', label: 'Rent paid', debitCode: '6200', creditCode: '1000', memo: 'Rent' },
  { id: 'salaries', label: 'Salaries paid', debitCode: '6100', creditCode: '1000', memo: 'Salaries & wages' },
  { id: 'vat-payment', label: 'VAT paid to SARS', debitCode: '2100', creditCode: '1000', memo: 'VAT201 payment' },
  { id: 'loan-repay', label: 'Loan repayment', debitCode: '2300', creditCode: '1000', memo: 'Loan repayment' },
  { id: 'stock-buy', label: 'Inventory purchase (cash)', debitCode: '1200', creditCode: '1000', memo: 'Stock purchase' },
]

export function buildTrialBalance(journal = [], accounts = []) {
  const map = {}
  const nameOf = (code) => accounts.find((a) => String(a.code) === String(code))?.name || code
  const typeOf = (code) => accounts.find((a) => String(a.code) === String(code))?.type || guessType(code)
  const bump = (code, debit, credit) => {
    if (!code) return
    const c = String(code)
    if (!map[c]) map[c] = { code: c, name: nameOf(c), type: typeOf(c), debit: 0, credit: 0 }
    map[c].debit += Number(debit) || 0
    map[c].credit += Number(credit) || 0
  }
  for (const j of journal) {
    const amt = Number(j.debit) || Number(j.credit) || Number(j.amount) || 0
    bump(j.debitCode, j.debit != null ? j.debit : amt, 0)
    bump(j.creditCode, 0, j.credit != null ? j.credit : amt)
  }
  const rows = Object.values(map)
    .filter((r) => r.debit || r.credit)
    .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
  return {
    rows,
    totalDr: rows.reduce((s, r) => s + r.debit, 0),
    totalCr: rows.reduce((s, r) => s + r.credit, 0),
  }
}

function guessType(code) {
  const n = Number(String(code).slice(0, 1))
  if (n === 1) return 'asset'
  if (n === 2) return 'liability'
  if (n === 3) return 'equity'
  if (n === 4) return 'income'
  return 'expense'
}

export function netBalance(row) {
  const dr = Number(row.debit) || 0
  const cr = Number(row.credit) || 0
  const t = row.type || guessType(row.code)
  if (t === 'asset' || t === 'expense') return dr - cr
  return cr - dr
}

export function buildProfitAndLoss(journal = [], accounts = []) {
  const tb = buildTrialBalance(journal, accounts)
  const income = []
  const expense = []
  for (const r of tb.rows) {
    const t = r.type || guessType(r.code)
    const net = netBalance({ ...r, type: t })
    if (t === 'income' && net) income.push({ ...r, net })
    if (t === 'expense' && net) expense.push({ ...r, net })
  }
  const totalIncome = income.reduce((s, r) => s + r.net, 0)
  const totalExpense = expense.reduce((s, r) => s + r.net, 0)
  return {
    income: income.sort((a, b) => b.net - a.net),
    expense: expense.sort((a, b) => b.net - a.net),
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    grossMarginPct: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
  }
}

export function buildBalanceSheet(journal = [], accounts = []) {
  const tb = buildTrialBalance(journal, accounts)
  const assets = []
  const liabilities = []
  const equity = []
  for (const r of tb.rows) {
    const t = r.type || guessType(r.code)
    const net = netBalance({ ...r, type: t })
    if (!net) continue
    if (t === 'asset') assets.push({ ...r, net })
    else if (t === 'liability') liabilities.push({ ...r, net })
    else if (t === 'equity') equity.push({ ...r, net })
  }
  const pl = buildProfitAndLoss(journal, accounts)
  if (pl.netProfit) {
    equity.push({
      code: 'PL',
      name: 'Current period surplus / (deficit)',
      type: 'equity',
      debit: 0,
      credit: 0,
      net: pl.netProfit,
    })
  }
  const totalAssets = assets.reduce((s, r) => s + r.net, 0)
  const totalLiab = liabilities.reduce((s, r) => s + r.net, 0)
  const totalEquity = equity.reduce((s, r) => s + r.net, 0)
  return {
    assets: assets.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })),
    liabilities: liabilities.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })),
    equity: equity.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })),
    totalAssets,
    totalLiab,
    totalEquity,
    totalLiabEquity: totalLiab + totalEquity,
    balanced: Math.abs(totalAssets - (totalLiab + totalEquity)) < 0.05,
  }
}

export function agedBuckets(invoices = []) {
  const now = Date.now()
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 }
  const rows = []
  for (const inv of invoices) {
    if (inv.isCredit || inv.status === 'paid' || inv.status === 'cancelled') continue
    const due = Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0
    if (due <= 0) continue
    const dueDate = new Date(inv.dueDate || inv.date || now)
    const days = Math.floor((now - dueDate.getTime()) / 86400000)
    let bucket = 'current'
    if (days > 90) bucket = 'older'
    else if (days > 60) bucket = 'd90'
    else if (days > 30) bucket = 'd60'
    else if (days > 0) bucket = 'd30'
    buckets[bucket] += due
    rows.push({ ...inv, days, bucket, due })
  }
  rows.sort((a, b) => b.days - a.days)
  return { buckets, rows, total: rows.reduce((s, r) => s + r.due, 0) }
}

export function expensePayables(expenses = []) {
  const rows = []
  let total = 0
  for (const e of expenses) {
    if (e.paid === true || e.status === 'paid') continue
    const amt = Number(e.amount) || 0
    if (amt <= 0) continue
    total += amt
    rows.push({ ...e, due: amt })
  }
  rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  return { rows, total }
}

export function vatSummary(invoices = [], expenses = [], period = '') {
  const inP = (d) => !period || String(d || '').startsWith(period)
  let output = 0
  let input = 0
  let standardSales = 0
  let zeroRated = 0
  for (const inv of invoices) {
    if (!inP(inv.date) || inv.status === 'cancelled') continue
    const vat = Number(inv.vatAmount != null ? inv.vatAmount : inv.tax) || 0
    const total = Number(inv.total) || 0
    const sub = Number(inv.subtotal) || total - vat
    if (inv.vatRate === 0 || inv.zeroRated) {
      zeroRated += sub
    } else {
      standardSales += sub
      output += vat > 0 ? vat : 0
    }
  }
  for (const e of expenses) {
    if (!inP(e.date)) continue
    const vat = Number(e.vatAmount != null ? e.vatAmount : e.tax) || 0
    if (vat > 0) input += vat
    else if (e.vatInclusive && e.amount) {
      const gross = Number(e.amount) || 0
      input += gross - gross / 1.15
    }
  }
  const net = output - input
  return {
    output,
    input,
    net,
    payable: Math.max(0, net),
    refundable: Math.max(0, -net),
    standardSales,
    zeroRated,
  }
}

export function monthlyRevenueTrend(invoices = [], months = 6) {
  const map = {}
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map[key] = { period: key, revenue: 0, count: 0 }
  }
  for (const inv of invoices) {
    if (inv.isCredit || inv.status === 'cancelled') continue
    const key = String(inv.date || '').slice(0, 7)
    if (!map[key]) continue
    map[key].revenue += Number(inv.total) || 0
    map[key].count += 1
  }
  return Object.values(map)
}

export function monthlyExpenseTrend(expenses = [], months = 6) {
  const map = {}
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map[key] = { period: key, expense: 0, count: 0 }
  }
  for (const e of expenses) {
    const key = String(e.date || '').slice(0, 7)
    if (!map[key]) continue
    map[key].expense += Number(e.amount) || 0
    map[key].count += 1
  }
  return Object.values(map)
}

export function cashPosition(bankTxns = [], journal = []) {
  const bankNet = (bankTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0)
  let jCash = 0
  for (const j of journal || []) {
    const amt = Number(j.amount) || Number(j.debit) || Number(j.credit) || 0
    if (String(j.debitCode) === '1000') jCash += amt
    if (String(j.creditCode) === '1000') jCash -= amt
  }
  const unreconciled = (bankTxns || []).filter((t) => !t.reconciled)
  const unrecSum = unreconciled.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  return {
    bankStatementNet: bankNet,
    ledgerCash: jCash,
    variance: bankNet - jCash,
    unreconciledCount: unreconciled.length,
    unreconciledSum: unrecSum,
  }
}

export function booksHealth({ invoices = [], expenses = [], journal = [], accounts = [], bankTxns = [], payments = [] }) {
  const checks = []
  const tb = buildTrialBalance(journal, accounts)
  const tbOk = Math.abs((tb.totalDr || 0) - (tb.totalCr || 0)) < 0.05
  checks.push({ id: 'tb', ok: tbOk, label: 'Trial balance balances', detail: tbOk ? 'Dr = Cr' : `Δ ${Math.abs((tb.totalDr || 0) - (tb.totalCr || 0)).toFixed(2)}` })
  checks.push({ id: 'coa', ok: (accounts || []).length >= 8, label: 'Chart of accounts seeded', detail: `${(accounts || []).length} accounts` })
  checks.push({ id: 'journal', ok: (journal || []).length > 0, label: 'Journal activity exists', detail: `${(journal || []).length} entries` })
  const openAr = agedBuckets(invoices).total
  checks.push({ id: 'ar', ok: true, label: 'Open receivables', detail: openAr.toFixed(2) })
  const unrec = (bankTxns || []).filter((t) => !t.reconciled).length
  checks.push({ id: 'bank', ok: unrec === 0, label: 'Bank lines reconciled', detail: unrec ? `${unrec} open` : 'All clear' })
  const paidNoJournal = (payments || []).filter((p) => !(journal || []).some((j) => j.paymentId === p.id || j.sourceKey === `pay-${p.id}`)).length
  checks.push({ id: 'post', ok: paidNoJournal === 0, label: 'Payments auto-posted', detail: paidNoJournal ? `${paidNoJournal} missing` : 'OK' })
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
  return { score, checks }
}

export function topExpenseCategories(expenses = [], period = '', limit = 8) {
  const inP = (d) => !period || String(d || '').startsWith(period)
  const map = {}
  for (const e of expenses) {
    if (!inP(e.date)) continue
    const cat = e.category || e.accountCode || e.description || 'Other'
    map[cat] = (map[cat] || 0) + (Number(e.amount) || 0)
  }
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function periodLabel(period) {
  if (!period) return 'All time'
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-')
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${names[Number(m) - 1] || m} ${y}`
  }
  return period
}

export function previousPeriod(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return ''
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function comparePeriods({ invoices = [], expenses = [], payments = [], period }) {
  const prev = previousPeriod(period)
  const slice = (p) => {
    const inP = (d) => !p || String(d || '').startsWith(p)
    const paid = invoices.filter((i) => i.status === 'paid' && !i.isCredit && inP(i.date))
    const rev = paid.reduce((s, i) => s + (Number(i.total) || 0), 0)
    const exp = expenses.filter((e) => inP(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const pay = payments.filter((x) => inP(x.date)).reduce((s, x) => s + (Number(x.amount) || 0), 0)
    const invCount = invoices.filter((i) => inP(i.date) && !i.isCredit && i.status !== 'cancelled').length
    return { period: p || 'all', revenue: rev, expenses: exp, collections: pay, invoices: invCount, net: rev - exp }
  }
  const cur = slice(period)
  const last = slice(prev)
  const pct = (a, b) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100)
  return {
    current: cur,
    previous: last,
    delta: {
      revenuePct: pct(cur.revenue, last.revenue),
      expensesPct: pct(cur.expenses, last.expenses),
      collectionsPct: pct(cur.collections, last.collections),
      netPct: pct(cur.net, last.net),
    },
  }
}

export function debtorConcentration(invoices = [], limit = 8) {
  const map = {}
  for (const inv of invoices) {
    if (inv.isCredit || inv.status === 'paid' || inv.status === 'cancelled') continue
    const due = Number(inv.amountDue != null ? inv.amountDue : inv.total) || 0
    if (due <= 0) continue
    const key = inv.clientName || inv.clientId || 'Unknown'
    map[key] = (map[key] || 0) + due
  }
  const rows = Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  const all = rows.reduce((s, r) => s + r.total, 0) || 1
  return rows.slice(0, limit).map((r) => ({ ...r, sharePct: (r.total / all) * 100 }))
}

export function monthEndChecklist({ invoices = [], expenses = [], journal = [], bankTxns = [], payments = [], accounts = [], period }) {
  const inP = (d) => !period || String(d || '').startsWith(period)
  const items = []
  const unpostedInv = invoices.filter((i) => inP(i.date) && !i.isCredit && i.status !== 'cancelled' && !(journal || []).some((j) => j.sourceKey === `inv-${i.id}`)).length
  items.push({ id: 'post-inv', ok: unpostedInv === 0, label: 'Invoices posted to journal', detail: unpostedInv ? `${unpostedInv} missing` : 'OK' })
  const unpostedPay = payments.filter((p) => inP(p.date) && !(journal || []).some((j) => j.sourceKey === `pay-${p.id}`)).length
  items.push({ id: 'post-pay', ok: unpostedPay === 0, label: 'Payments posted', detail: unpostedPay ? `${unpostedPay} missing` : 'OK' })
  const unpostedExp = expenses.filter((e) => inP(e.date) && !(journal || []).some((j) => j.sourceKey === `exp-${e.id}`)).length
  items.push({ id: 'post-exp', ok: unpostedExp === 0, label: 'Expenses posted', detail: unpostedExp ? `${unpostedExp} missing` : 'OK' })
  const unrec = (bankTxns || []).filter((t) => !t.reconciled && inP(t.date)).length
  items.push({ id: 'bank', ok: unrec === 0, label: 'Bank reconciled for period', detail: unrec ? `${unrec} open` : 'OK' })
  items.push({ id: 'coa', ok: (accounts || []).length >= 8, label: 'CoA present', detail: `${(accounts || []).length} accounts` })
  const tb = buildTrialBalance((journal || []).filter((j) => inP(j.date)), accounts)
  const bal = Math.abs((tb.totalDr || 0) - (tb.totalCr || 0)) < 0.05
  items.push({ id: 'tb', ok: bal, label: 'Trial balance balances', detail: bal ? 'Dr = Cr' : 'Out of balance' })
  const openAr = agedBuckets(invoices).rows.filter((r) => r.days > 60).length
  items.push({ id: 'chase', ok: openAr === 0, label: 'No AR over 60 days', detail: openAr ? `${openAr} invoices` : 'OK' })
  const done = items.filter((i) => i.ok).length
  return { items, score: Math.round((done / items.length) * 100), done, total: items.length }
}

export function revenueLedgerVariance(invoices = [], journal = [], period = '') {
  const inP = (d) => !period || String(d || '').startsWith(period)
  const invRev = invoices
    .filter((i) => inP(i.date) && !i.isCredit && i.status !== 'cancelled')
    .reduce((s, i) => s + (Number(i.total) || 0), 0)
  let ledRev = 0
  for (const j of journal) {
    if (!inP(j.date)) continue
    if (String(j.creditCode) === '4000' || String(j.creditCode) === '4100') {
      ledRev += Number(j.amount) || Number(j.credit) || Number(j.debit) || 0
    }
  }
  return { invoiceRevenue: invRev, ledgerRevenue: ledRev, variance: invRev - ledRev }
}
