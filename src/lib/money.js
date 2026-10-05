
export function formatMoney(n, currency = 'ZAR') {
  const v = Number(n) || 0
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v)
  } catch {
    return 'R ' + v.toFixed(2)
  }
}

export function calcLine(qty, price, vatRate = 0.15, vatEnabled = true) {
  const q = Number(qty) || 0
  const p = Number(price) || 0
  const exclusive = q * p
  const vat = vatEnabled ? exclusive * vatRate : 0
  return { exclusive, vat, total: exclusive + vat }
}

export function invoiceTotals(lines, vatRate = 0.15, vatEnabled = true) {
  let exclusive = 0, vat = 0
  for (const l of lines || []) {
    const c = calcLine(l.qty, l.price, vatRate, vatEnabled)
    exclusive += c.exclusive
    vat += c.vat
  }
  return { exclusive, vat, total: exclusive + vat }
}

export function uid(prefix = '') {
  return prefix + crypto.randomUUID().slice(0, 8)
}
