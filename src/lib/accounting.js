
export const DEFAULT_COA = [
  { code: '1000', name: 'Bank / Cash', type: 'asset' },
  { code: '1010', name: 'Petty Cash', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory / Stock', type: 'asset' },
  { code: '1500', name: 'Fixed Assets – Equipment', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'VAT Control', type: 'liability' },
  { code: '2200', name: 'PAYE / UIF / SDL Control', type: 'liability' },
  { code: '3000', name: 'Owner Equity / Capital', type: 'equity' },
  { code: '3100', name: 'Retained Earnings', type: 'equity' },
  { code: '3200', name: 'Owner Drawings', type: 'equity' },
  { code: '4000', name: 'Sales / Service Revenue', type: 'income' },
  { code: '4100', name: 'Other Income', type: 'income' },
  { code: '5000', name: 'Cost of Sales / Materials', type: 'expense' },
  { code: '6100', name: 'Salaries & Wages', type: 'expense' },
  { code: '6200', name: 'Rent & Premises', type: 'expense' },
  { code: '6300', name: 'Fuel & Travel', type: 'expense' },
  { code: '6400', name: 'Utilities & Communications', type: 'expense' },
  { code: '6700', name: 'Bank Charges & Interest', type: 'expense' },
  { code: '6900', name: 'General & Admin Expenses', type: 'expense' },
]

export function buildTrialBalance(journal = [], accounts = []) {
  const map = {}
  const nameOf = (code) => accounts.find((a) => String(a.code) === String(code))?.name || code
  const bump = (code, debit, credit) => {
    if (!code) return
    const c = String(code)
    if (!map[c]) map[c] = { code: c, name: nameOf(c), debit: 0, credit: 0 }
    map[c].debit += Number(debit) || 0
    map[c].credit += Number(credit) || 0
  }
  for (const j of journal) {
    const amt = Number(j.debit) || Number(j.credit) || Number(j.amount) || 0
    bump(j.debitCode, j.debit != null ? j.debit : amt, 0)
    bump(j.creditCode, 0, j.credit != null ? j.credit : amt)
  }
  const rows = Object.values(map).filter((r) => r.debit || r.credit).sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
  return {
    rows,
    totalDr: rows.reduce((s, r) => s + r.debit, 0),
    totalCr: rows.reduce((s, r) => s + r.credit, 0),
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
  return { buckets, rows }
}
