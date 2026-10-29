import * as db from './db'

const KEY = 'audit_log'
const MAX = 500

export async function audit(event, detail = {}) {
  try {
    const prev = (await db.getSetting(KEY)) || []
    const list = Array.isArray(prev) ? prev : []
    list.unshift({
      id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      event: String(event || 'event'),
      ...detail,
    })
    await db.setSetting(KEY, list.slice(0, MAX))
    return true
  } catch (e) {
    console.warn('[audit]', e)
    return false
  }
}

export async function listAudit(limit = 100) {
  try {
    const prev = (await db.getSetting(KEY)) || []
    return (Array.isArray(prev) ? prev : []).slice(0, limit)
  } catch {
    return []
  }
}

export async function clearAudit() {
  await db.setSetting(KEY, [])
}
