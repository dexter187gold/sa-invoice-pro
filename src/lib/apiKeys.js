import * as db from './db'
import { audit } from './auditLog'

const KEY = 'api_keys'

function randomKey() {
  const a = crypto.getRandomValues(new Uint8Array(24))
  return 'saip_' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function listApiKeys() {
  const rows = (await db.getSetting(KEY)) || []
  return Array.isArray(rows) ? rows : []
}

export async function createApiKey(label = 'Integration') {
  const rows = await listApiKeys()
  const row = {
    id: 'key_' + Date.now().toString(36),
    label: String(label || 'Integration').trim(),
    key: randomKey(),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    enabled: true,
  }
  rows.unshift(row)
  await db.setSetting(KEY, rows.slice(0, 20))
  await audit('apikey.create', { id: row.id, label: row.label })
  return row
}

export async function revokeApiKey(id) {
  const rows = (await listApiKeys()).map((k) =>
    k.id === id ? { ...k, enabled: false, revokedAt: new Date().toISOString() } : k,
  )
  await db.setSetting(KEY, rows)
  await audit('apikey.revoke', { id })
}

export async function verifyApiKey(raw) {
  const rows = await listApiKeys()
  const hit = rows.find((k) => k.enabled && k.key === raw)
  if (!hit) return null
  hit.lastUsedAt = new Date().toISOString()
  await db.setSetting(KEY, rows)
  return hit
}
