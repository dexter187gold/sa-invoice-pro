import * as db from './db'
import { STORES } from './db'
import { audit } from './auditLog'

export async function applyStockFromInvoice(invoice, products = []) {
  if (!invoice?.lines?.length) return { adjusted: 0 }
  let adjusted = 0
  for (const line of invoice.lines) {
    const qty = Number(line.qty ?? line.quantity) || 0
    if (qty <= 0) continue
    let prod = null
    if (line.productId) prod = products.find((p) => String(p.id) === String(line.productId))
    if (!prod && line.sku) prod = products.find((p) => String(p.sku || '') === String(line.sku))
    if (!prod && line.description) {
      prod = products.find((p) => String(p.name || '').toLowerCase() === String(line.description).toLowerCase())
    }
    if (!prod || prod.stock == null) continue
    const next = Math.max(0, Number(prod.stock) - qty)
    await db.put(STORES.products, { ...prod, stock: next })
    adjusted++
    prod.stock = next
  }
  if (adjusted) await audit('stock.decrement', { invoiceId: invoice.id, adjusted })
  return { adjusted }
}
