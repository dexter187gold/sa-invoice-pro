import * as db from './db'
import { ROLES } from './roles'
import { audit } from './auditLog'

const KEY = 'team_seats'
const ACTIVE = 'active_seat_id'

export async function listSeats() {
  const rows = (await db.getSetting(KEY)) || []
  return Array.isArray(rows) ? rows : []
}

export async function saveSeats(rows) {
  await db.setSetting(KEY, rows)
}

export async function upsertSeat(seat) {
  const rows = await listSeats()
  const id = seat.id || 'seat_' + Date.now().toString(36)
  const next = {
    id,
    name: String(seat.name || 'Team member').trim(),
    email: String(seat.email || '').trim().toLowerCase(),
    role: seat.role || 'tech',
    active: seat.active !== false,
    pin: seat.pin ? String(seat.pin).slice(0, 8) : '',
    updatedAt: new Date().toISOString(),
  }
  const idx = rows.findIndex((r) => r.id === id)
  if (idx >= 0) rows[idx] = { ...rows[idx], ...next }
  else rows.push({ ...next, createdAt: new Date().toISOString() })
  await saveSeats(rows)
  await audit('seat.upsert', { seatId: id, role: next.role, name: next.name })
  return next
}

export async function removeSeat(id) {
  const rows = (await listSeats()).filter((r) => r.id !== id)
  await saveSeats(rows)
  const active = await getActiveSeatId()
  if (active === id) await setActiveSeatId('')
  await audit('seat.remove', { seatId: id })
}

export async function getActiveSeatId() {
  return (await db.getSetting(ACTIVE)) || ''
}

export async function setActiveSeatId(id) {
  await db.setSetting(ACTIVE, id || '')
}

export async function getActiveSeat() {
  const id = await getActiveSeatId()
  if (!id) return null
  return (await listSeats()).find((s) => s.id === id) || null
}

export function seatLimitForTier(tierId) {
  if (tierId === 'solo') return 1
  if (tierId === 'shop') return 5
  if (tierId === 'multi') return 25
  return 5
}

export { ROLES }
