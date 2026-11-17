/** South African bank CSV column presets for import mapping. */
export const BANK_PRESETS = [
  {
    id: 'fnb',
    label: 'FNB Online / CSV',
    date: ['Date', 'Transaction Date', 'Tran Date'],
    description: ['Description', 'Narrative', 'Details'],
    amount: ['Amount', 'Transaction Amount'],
    debit: ['Debit', 'Debit Amount'],
    credit: ['Credit', 'Credit Amount'],
    balance: ['Balance', 'Running Balance'],
    reference: ['Reference', 'Ref'],
  },
  {
    id: 'standard',
    label: 'Standard Bank',
    date: ['Date', 'Posting Date', 'Transaction Date'],
    description: ['Description', 'Transaction Description'],
    amount: ['Amount'],
    debit: ['Debit Amount', 'Debits'],
    credit: ['Credit Amount', 'Credits'],
    balance: ['Balance'],
    reference: ['Reference', 'Bank Reference'],
  },
  {
    id: 'absa',
    label: 'Absa',
    date: ['Date', 'Transaction date'],
    description: ['Description', 'Transaction description'],
    amount: ['Amount'],
    debit: ['Debit'],
    credit: ['Credit'],
    balance: ['Balance'],
    reference: ['Reference'],
  },
  {
    id: 'nedbank',
    label: 'Nedbank',
    date: ['Date', 'Value Date'],
    description: ['Description'],
    amount: ['Amount'],
    debit: ['Debit'],
    credit: ['Credit'],
    balance: ['Balance'],
    reference: ['Reference'],
  },
  {
    id: 'capitec',
    label: 'Capitec Business',
    date: ['Date', 'Transaction Date'],
    description: ['Description', 'Details'],
    amount: ['Amount'],
    debit: ['Money out', 'Debit'],
    credit: ['Money in', 'Credit'],
    balance: ['Balance'],
    reference: ['Reference'],
  },
]

export function findBankPreset(id) {
  return BANK_PRESETS.find((p) => p.id === id) || null
}

export function guessBankPreset(headers = []) {
  const h = headers.map((x) => String(x || '').toLowerCase())
  const score = (preset) => {
    let s = 0
    for (const group of [preset.date, preset.description, preset.amount, preset.debit, preset.credit]) {
      for (const name of group || []) {
        if (h.includes(String(name).toLowerCase())) s++
      }
    }
    return s
  }
  let best = null
  let bestScore = 0
  for (const p of BANK_PRESETS) {
    const sc = score(p)
    if (sc > bestScore) {
      best = p
      bestScore = sc
    }
  }
  return bestScore >= 2 ? best : null
}
