export const VAT_RATE_DEFAULT = 0.15

/** Accept stored decimal rates (0.15) and legacy UI percentages (15). */
export function normalizeVatRate(value, fallback = VAT_RATE_DEFAULT) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  const rate = n > 1 ? n / 100 : n
  return Math.min(rate, 1)
}

export function normalizeVatEnabled(value, fallback = false) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false' || value == null) return false
  return fallback
}
