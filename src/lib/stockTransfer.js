/**
 * Inter-branch stock helpers — branchStock map on product rows.
 * Unscoped `stock` is treated as HQ / unassigned pool.
 */

export const HQ_KEY = '__hq__'

/** Read qty for a branch (or HQ). */
export function stockAt(product, branchId) {
  if (!product) return 0
  const key = branchId || HQ_KEY
  const map = product.branchStock && typeof product.branchStock === 'object' ? product.branchStock : null
  if (map && map[key] != null) return Math.max(0, Number(map[key]) || 0)
  if (!branchId || key === HQ_KEY) return Math.max(0, Number(product.stock) || 0)
  return 0
}

/** Total across HQ + all branch buckets. */
export function stockTotal(product) {
  if (!product) return 0
  const map = product.branchStock && typeof product.branchStock === 'object' ? product.branchStock : null
  if (!map) return Math.max(0, Number(product.stock) || 0)
  let n = 0
  for (const v of Object.values(map)) n += Math.max(0, Number(v) || 0)
  // Include legacy stock only if no HQ bucket yet
  if (map[HQ_KEY] == null && product.stock != null) n += Math.max(0, Number(product.stock) || 0)
  return n
}

/** Apply transfer; pure — returns next product row or throws. */
export function applyStockTransfer(product, { fromBranchId, toBranchId, qty, note } = {}) {
  const q = Math.floor(Number(qty) || 0)
  if (q <= 0) throw new Error('Quantity must be at least 1')
  const from = fromBranchId || HQ_KEY
  const to = toBranchId || HQ_KEY
  if (from === to) throw new Error('Source and destination branch must differ')
  const available = stockAt(product, from === HQ_KEY ? '' : from)
  if (q > available) {
    throw new Error(`Only ${available} available at source (requested ${q})`)
  }
  const map = {
    ...(product.branchStock && typeof product.branchStock === 'object' ? product.branchStock : {}),
  }
  // Seed HQ from legacy stock once
  if (map[HQ_KEY] == null && product.stock != null) {
    map[HQ_KEY] = Math.max(0, Number(product.stock) || 0)
  }
  map[from] = Math.max(0, (Number(map[from]) || 0) - q)
  map[to] = Math.max(0, (Number(map[to]) || 0) + q)
  const total = Object.values(map).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0)
  const history = Array.isArray(product.stockTransfers) ? product.stockTransfers.slice(-49) : []
  history.push({
    at: new Date().toISOString(),
    from,
    to,
    qty: q,
    note: String(note || '').slice(0, 200),
  })
  return {
    ...product,
    branchStock: map,
    stock: total,
    stockTransfers: history,
    updatedAt: new Date().toISOString(),
  }
}

export function formatBranchLabel(branchId, branches = []) {
  if (!branchId || branchId === HQ_KEY) return 'HQ / unassigned'
  const b = (branches || []).find((x) => String(x.id) === String(branchId))
  return b ? `${b.name}${b.code ? ` (${b.code})` : ''}` : branchId
}
