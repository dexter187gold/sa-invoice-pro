/** Local seats (roles) + tier limit helpers. */
import * as db from './db'
import { STORES } from './db'
import { ROLES as ROLE_DEFS } from './roles'

export const ROLES = ROLE_DEFS.map(({ id, label, description }) => ({ id, label, description }))

const LS_SEATS = 'saip_seats_v1'
const LS_ACTIVE = 'saip_active_seat_id'

async function readAll() {
  try {
    if (STORES?.seats) {
      const rows = await db.getAll(STORES.seats)
      if (Array.isArray(rows) && rows.length) return rows
    }
  } catch {}
  try {
    return JSON.parse(localStorage.getItem(LS_SEATS) || '[]')
  } catch {
    return []
  }
}

async function writeAll(rows) {
  try {
    localStorage.setItem(LS_SEATS, JSON.stringify(rows))
  } catch {}
  try {
    if (STORES?.seats) {
      for (const r of rows) await db.put(STORES.seats, r)
    }
  } catch {}
}

export async function listSeats() {
  return readAll()
}

export async function upsertSeat(input) {
  const rows = await readAll()
  const id = input.id || `seat-${Date.now()}`
  const next = {
    id,
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    role: input.role || 'tech',
    pin: input.pin || '',
    active: input.active !== false,
    updatedAt: new Date().toISOString(),
    createdAt: input.createdAt || new Date().toISOString(),
  }
  const idx = rows.findIndex((r) => String(r.id) === String(id))
  if (idx >= 0) rows[idx] = { ...rows[idx], ...next }
  else rows.push(next)
  await writeAll(rows)
  try {
    if (STORES?.seats) await db.put(STORES.seats, next)
  } catch {}
  return next
}

export async function removeSeat(id) {
  const rows = (await readAll()).filter((r) => String(r.id) !== String(id))
  await writeAll(rows)
  try {
    if (STORES?.seats) await db.remove(STORES.seats, id)
  } catch {}
  const active = await getActiveSeatId()
  if (String(active) === String(id)) await setActiveSeatId('')
}

export async function getActiveSeatId() {
  try {
    return localStorage.getItem(LS_ACTIVE) || ''
  } catch {
    return ''
  }
}

export async function setActiveSeatId(id) {
  try {
    if (id) localStorage.setItem(LS_ACTIVE, String(id))
    else localStorage.removeItem(LS_ACTIVE)
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('sa-active-seat', { detail: { id: id || '' } }))
  } catch {}
}

export async function getActiveSeat() {
  const id = await getActiveSeatId()
  if (!id) return null
  const rows = await readAll()
  return rows.find((r) => String(r.id) === String(id)) || null
}

/** Verify optional PIN when switching into a protected seat. */
export function verifySeatPin(seat, pin) {
  if (!seat) return false
  const expected = String(seat.pin || '').trim()
  if (!expected) return true
  return String(pin || '').trim() === expected
}

export function seatLimits(settings = {}, license = {}) {
  const raw = String(license.tier || settings.tier || 'solo').toLowerCase()
  const tier =
    raw === 'shop' || raw === 'team'
      ? 'shop'
      : raw === 'multi' || raw === 'multi_branch'
        ? 'multi'
        : raw === 'enterprise'
          ? 'enterprise'
          : 'solo'
  const defaults = {
    solo: { users: 1, branches: 1, devices: 2 },
    shop: { users: 5, branches: 1, devices: 8 },
    team: { users: 5, branches: 1, devices: 8 },
    multi: { users: 25, branches: 5, devices: 25 },
    multi_branch: { users: 25, branches: 5, devices: 25 },
    enterprise: { users: 50, branches: 20, devices: 100 },
  }
  const base = defaults[tier] || defaults.solo
  return {
    tier,
    users: Number(settings.maxUsers || license.maxUsers || base.users),
    branches: Number(settings.maxBranches || license.maxBranches || base.branches),
    devices: Number(settings.maxDevices || license.maxDevices || base.devices),
  }
}

export function seatUsage({ teamMembers = [], branches = [], devices = [] }, limits) {
  return {
    users: { used: teamMembers.length || 1, max: limits.users },
    branches: { used: Math.max(1, branches.length || 1), max: limits.branches },
    devices: { used: devices.length, max: limits.devices },
  }
}

/** Throw if adding a new seat would exceed tier user limit (edits of existing id ok). */
export async function assertCanAddSeat(settings = {}, license = {}, { seatId } = {}) {
  const limits = seatLimits(settings, license)
  const rows = await listSeats()
  const active = rows.filter((r) => r.active !== false).length
  const isEdit = seatId && rows.some((r) => String(r.id) === String(seatId))
  if (!isEdit && active >= limits.users) {
    const err = new Error(
      `Seat limit reached (${active}/${limits.users} on ${limits.tier}). Upgrade license tier or deactivate a seat.`,
    )
    err.code = 'seat_limit'
    throw err
  }
  return { active, max: limits.users, tier: limits.tier, isEdit: !!isEdit }
}

export function activeSeatSummary(seat) {
  if (!seat) return { label: 'Owner (default)', role: 'owner' }
  const role = ROLE_DEFS.find((r) => r.id === seat.role)
  return {
    label: seat.name || 'Seat',
    role: seat.role || 'tech',
    roleLabel: role?.label || seat.role,
    email: seat.email || '',
  }
}
