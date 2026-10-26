import * as db from './db'
import { audit } from './auditLog'

const KEY = 'branches'
const ACTIVE = 'active_branch_id'

export async function listBranches() {
  const rows = (await db.getSetting(KEY)) || []
  return Array.isArray(rows) ? rows : []
}

export async function saveBranches(rows) {
  await db.setSetting(KEY, rows)
}

export async function upsertBranch(b) {
  const rows = await listBranches()
  const id = b.id || 'br_' + Date.now().toString(36)
  const next = {
    id,
    name: String(b.name || 'Branch').trim(),
    code: String(b.code || '').trim().toUpperCase().slice(0, 8),
    address: String(b.address || '').trim(),
    phone: String(b.phone || '').trim(),
    active: b.active !== false,
    updatedAt: new Date().toISOString(),
  }
  const idx = rows.findIndex((r) => r.id === id)
  if (idx >= 0) rows[idx] = { ...rows[idx], ...next }
  else rows.push({ ...next, createdAt: new Date().toISOString() })
  await saveBranches(rows)
  await audit('branch.upsert', { branchId: id, name: next.name })
  return next
}

export async function removeBranch(id) {
  const rows = (await listBranches()).filter((r) => r.id !== id)
  await saveBranches(rows)
  const active = await getActiveBranchId()
  if (active === id) await setActiveBranchId('')
  await audit('branch.remove', { branchId: id })
}

export async function getActiveBranchId() {
  return (await db.getSetting(ACTIVE)) || ''
}

export async function setActiveBranchId(id) {
  await db.setSetting(ACTIVE, id || '')
  await audit('branch.switch', { branchId: id || null })
}

export async function getActiveBranch() {
  const id = await getActiveBranchId()
  if (!id) return null
  return (await listBranches()).find((b) => b.id === id) || null
}

export function filterByBranch(rows, activeBranchId, { includeUntagged = true } = {}) {
  if (!activeBranchId) return rows || []
  return (rows || []).filter((r) => {
    const bid = r.branchId
    if (!bid) return includeUntagged
    return String(bid) === String(activeBranchId)
  })
}

export function withBranch(record, branchId) {
  if (!branchId) return record
  return { ...record, branchId }
}
