/**
 * Cloud auth bridge — login / register against saip-sync, then mirror session locally.
 * After server resets, registration falls back to a local device account so beta testers are not blocked.
 */
import { Sync } from './sync.js'
import { canUseCloudSync } from './soloMode.js'
import * as db from './db.js'
import { STORES } from './db.js'
import { hashPassword } from './hash.js'
import { ensureWorkspaceSynced, flushPushQueue, clearPushQueue, describeEnsureResult } from './workspaceSync.js'
import { getSession } from './storage.js'

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())
}

/** Match saip-sync rule: min 6 chars, at least one letter and one number. */
export function passwordMeetsPolicy(password) {
  const s = String(password || '')
  return s.length >= 6 && /[A-Za-z]/.test(s) && /\d/.test(s)
}

export function passwordPolicyMessage() {
  return 'Password must be at least 6 characters and include letters and numbers (e.g. Shop123)'
}


/**
 * IndexedDB is device-local, not account-local. Before changing identities,
 * preserve the previous user's workspace under their email, then activate
 * only the target account's saved workspace (or an empty one).
 */
async function isolateWorkspaceForAccount(targetEmail) {
  const target = String(targetEmail || '').trim().toLowerCase()
  if (!target) throw new Error('Cannot switch workspace without an account email')
  const active = getSession()
  let previous = String(active?.email || '').trim().toLowerCase()
  if (!previous) {
    try { previous = String(localStorage.getItem('sa_active_workspace_account') || '').trim().toLowerCase() } catch {}
  }
  if (!previous || previous === target) {
    const localUsers = (await db.getAll(STORES.users)) || []
    if (localUsers.length === 1) {
      const candidate = String(localUsers[0]?.email || '').trim().toLowerCase()
      if (candidate && candidate !== target) previous = candidate
    }
  }
  if (previous && previous !== target) {
    await db.saveAccountWorkspace(previous)
    await db.clearActiveWorkspace()
    clearPushQueue()
  }
  if (previous !== target) {
    const restored = await db.restoreAccountWorkspace(target)
    if (!restored) await db.clearActiveWorkspace()
    clearPushQueue()
  }
  try { localStorage.setItem('sa_active_workspace_account', target) } catch {}
}

async function mirrorLocalUser(session, password, extra = {}) {
  const hashed = await hashPassword(password)
  const email = String(session.email || '').trim().toLowerCase()
  const users = (await db.getAll(STORES.users)) || []
  const existing = users.find((x) => {
    const em = String(x.email || '').trim().toLowerCase()
    const un = String(x.username || '').trim().toLowerCase()
    return em === email || un === email.split('@')[0]
  })
  const row = {
    ...(existing || {}),
    id: existing?.id || session.id || (crypto.randomUUID?.() || 'u_' + Date.now()),
    username: extra.username || existing?.username || email.split('@')[0],
    email,
    name: session.name || email.split('@')[0],
    password: hashed,
    teamRole: session.teamRole || existing?.teamRole,
    linkedWorkspaceOwnerId: session.linkedWorkspaceOwnerId || existing?.linkedWorkspaceOwnerId,
    updatedAt: new Date().toISOString(),
  }
  await db.put(STORES.users, row)
  return row
}

async function localRegister(form, ctx = {}) {
  const { setSession, setUser, refresh, toast } = ctx
  const email = String(form?.email || '').trim().toLowerCase()
  const password = form?.password
  const name = form?.name || form?.username || email.split('@')[0]
  const username = String(form?.username || email.split('@')[0]).trim()
  if (!email || !password) throw new Error('Email and password required')
  if (!passwordMeetsPolicy(password)) throw new Error(passwordPolicyMessage())

  const users = (await db.getAll(STORES.users)) || []
  const taken = users.find((x) => {
    const em = String(x.email || '').trim().toLowerCase()
    const un = String(x.username || '').trim().toLowerCase()
    return em === email || un === username.toLowerCase()
  })
  if (taken) throw new Error('An account with this email or username already exists on this device — sign in instead')

  const session = {
    id: crypto.randomUUID?.() || 'u_' + Date.now(),
    email,
    name,
    cloud: false,
  }
  await isolateWorkspaceForAccount(email)
  await mirrorLocalUser(session, password, { username })
  setSession?.(session)
  setUser?.(session)
  if (refresh) await refresh()
  if (toast) toast('Account created on this device (cloud will link when available)', 'success')
  return { cloud: false, user: session }
}

/**
 * Cloud-first login. Falls back to local-only if cloud is off or unreachable
 * and a matching local user exists.
 */
export async function cloudLogin(username, password, ctx = {}) {
  const { online = true, toast, setSession, setUser, refresh, skipAutoPush } = ctx
  const raw = String(username || '').trim()
  const email = isEmail(raw) ? raw.toLowerCase() : raw
  if (!raw || !password) throw new Error('Email and password required')

  if (canUseCloudSync() && online !== false) {
    try {
      const data = await Sync.login(isEmail(email) ? email : raw, password)
      const u = data.user || { email: isEmail(email) ? email : raw }
      const session = {
        id: u.id,
        email: u.email || email,
        name: u.name || u.email || email,
        teamRole: u.teamRole,
        linkedWorkspaceOwnerId: u.linkedWorkspaceOwnerId,
        cloud: true,
      }
      await isolateWorkspaceForAccount(session.email)
      setSession?.(session)
      setUser?.(session)
      try {
        await mirrorLocalUser(session, password)
      } catch (e) {
        console.warn('[cloudLogin] local mirror', e?.message || e)
      }

      if (skipAutoPush) skipAutoPush.current = true
      try {
        await flushPushQueue().catch(() => {})
        const result = await ensureWorkspaceSynced({ forcePush: true })
        if (refresh) await refresh()
        if (toast && result?.ok) {
          const msg = describeEnsureResult(result)
          if (msg && !/empty|none/i.test(msg)) toast(msg, 'success')
          else toast('Signed in — cloud sync ready', 'success')
        } else if (toast) {
          toast('Signed in', 'success')
        }
      } catch (e) {
        if (toast) toast('Signed in — sync will retry shortly', 'info')
        console.warn('[cloudLogin] post-login sync', e?.message || e)
      } finally {
        if (skipAutoPush) skipAutoPush.current = false
      }
      return { cloud: true, user: session }
    } catch (e) {
      const msg = String(e?.message || e)
      if (/Invalid email or password/i.test(msg)) {
        // Still try local — backup import may have local password only after cloud reset
      } else {
        console.warn('[cloudLogin] cloud failed, trying local', msg)
        if (toast && /waking|offline|Network|502|503/i.test(msg)) {
          toast('Cloud waking up — trying local login…', 'info')
        }
      }
    }
  }

  const users = (await db.getAll(STORES.users)) || []
  const needle = String(email || '').trim().toLowerCase()
  const local = users.find((x) => {
    const un = String(x.username || '').trim().toLowerCase()
    const em = String(x.email || '').trim().toLowerCase()
    return un === needle || em === needle || un === raw.toLowerCase() || em === raw.toLowerCase()
  })
  if (!local) {
    if (!canUseCloudSync()) {
      throw new Error('No local account. Create an account or import a backup JSON first.')
    }
    throw new Error('Invalid email or password. After a cloud reset, create a new account or import your backup JSON.')
  }
  const { verifyPassword } = await import('./hash.js')
  const ok = await verifyPassword(password, local.password)
  if (!ok) throw new Error('Invalid email or password')
  const session = {
    id: local.id,
    email: local.email || local.username,
    name: local.name || local.username,
    cloud: false,
  }
  await isolateWorkspaceForAccount(session.email)
  setSession?.(session)
  setUser?.(session)
  if (refresh) await refresh()
  if (toast) toast('Signed in (this device only)', 'success')
  return { cloud: false, user: session }
}

export async function cloudRegister(form, ctx = {}) {
  const { online = true, toast, setSession, setUser, refresh } = ctx
  const email = String(form?.email || '').trim().toLowerCase()
  const password = form?.password
  const name = form?.name || form?.username || email.split('@')[0]
  if (!email || !password) throw new Error('Email and password required')
  if (!passwordMeetsPolicy(password)) throw new Error(passwordPolicyMessage())

  if (canUseCloudSync() && online !== false) {
    try {
      const data = await Sync.register(email, password, name)
      const u = data.user || { email, name }
      const session = {
        id: u.id,
        email: u.email || email,
        name: u.name || name,
        cloud: true,
      }
      await isolateWorkspaceForAccount(session.email)
      setSession?.(session)
      setUser?.(session)
      try {
        await mirrorLocalUser(session, password, { username: form?.username })
      } catch (e) {
        console.warn('[cloudRegister] local mirror', e?.message || e)
      }
      try {
        await ensureWorkspaceSynced({ forcePush: true })
      } catch {}
      if (refresh) await refresh()
      if (toast) toast('Account created — cloud sync enabled', 'success')
      return { cloud: true, user: session }
    } catch (e) {
      const msg = String(e?.message || e)
      if (/letters and numbers|Password must/i.test(msg)) throw new Error(passwordPolicyMessage())
      if (/already|exists|taken|in use/i.test(msg)) {
        throw new Error('Account already exists on cloud — sign in instead (or use Forgot password)')
      }
      console.warn('[cloudRegister] cloud failed, local fallback', msg)
      if (toast) toast('Cloud unavailable after reset — creating local account…', 'info')
    }
  }

  return localRegister(form, { setSession, setUser, refresh, toast })
}
