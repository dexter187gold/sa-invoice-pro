/** ZAR-safe money helpers for SA Invoice Pro */

export function formatMoney(n, currency = 'ZAR') {
  const v = Number(n)
  const safe = Number.isFinite(v) ? v : 0
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe)
  } catch {
    return 'R ' + safe.toFixed(2)
  }
}

export function parseMoney(s) {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0
  const cleaned = String(s || '').replace(/[^\d.,\-]/g, '').replace(',', '.')
  const v = parseFloat(cleaned)
  return Number.isFinite(v) ? v : 0
}

export function calcLine(qty, price, vatRate = 0.15, vatEnabled = true) {
  const q = Number(qty) || 0
  const p = Number(price) || 0
  const exclusive = Math.round(q * p * 100) / 100
  const vat = vatEnabled ? Math.round(exclusive * vatRate * 100) / 100 : 0
  return { exclusive, vat, total: Math.round((exclusive + vat) * 100) / 100 }
}

export function invoiceTotals(lines, vatRate = 0.15, vatEnabled = true) {
  let exclusive = 0, vat = 0
  for (const l of lines || []) {
    const c = calcLine(l.qty, l.price, vatRate, vatEnabled)
    exclusive += c.exclusive
    vat += c.vat
  }
  exclusive = Math.round(exclusive * 100) / 100
  vat = Math.round(vat * 100) / 100
  return { exclusive, vat, total: Math.round((exclusive + vat) * 100) / 100 }
}

export function uid(prefix = '') {
  return prefix + crypto.randomUUID().slice(0, 8)
}
