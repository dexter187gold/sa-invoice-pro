/**
 * Cloud auth bridge — login / register against saip-sync, then mirror session locally.
 */
import { Sync } from './sync.js'
import { canUseCloudSync } from './soloMode.js'
import * as db from './db.js'
import { STORES } from './db.js'
import { hashPassword } from './hash.js'
import { ensureWorkspaceSynced, flushPushQueue, describeEnsureResult } from './workspaceSync.js'

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())
}

/**
 * Cloud-first login. Falls back to local-only if cloud is off or unreachable
 * and a matching local user exists.
 */
export async function cloudLogin(username, password, ctx = {}) {
  const { online = true, toast, setSession, setUser, refresh, skipAutoPush } = ctx
  const raw = String(username || '').trim()
  const email = raw.toLowerCase()
  if (!raw || !password) throw new Error('Email and password required')

  if (canUseCloudSync() && online !== false) {
    try {
      const data = await Sync.login(isEmail(email) ? email : raw, password)
      const u = data.user || { email, name: email.split('@')[0] }
      let profile = null
      try { profile = await Sync.me() } catch {}
      const cloudUser = profile?.user || {}
      const session = {
        id: u.id,
        email: u.email || email,
        name: u.name || (u.email || email).split('@')[0],
        cloud: true,
        teamRole: cloudUser.teamRole || null,
        linkedWorkspaceOwnerId: cloudUser.linkedWorkspaceOwnerId || null,
      }
      setSession?.(session)
      setUser?.(session)

      try {
        const users = (await db.getAll(STORES.users)) || []
        let local = users.find(
          (x) => String(x.email || '').toLowerCase() === String(session.email).toLowerCase()
        )
        const hashed = await hashPassword(password)
        if (local) {
          await db.put(STORES.users, { ...local, password: hashed, name: session.name, email: session.email, teamRole: session.teamRole, linkedWorkspaceOwnerId: session.linkedWorkspaceOwnerId })
        } else {
          await db.put(STORES.users, {
            id: session.id || (crypto.randomUUID?.() || 'u_' + Date.now()),
            username: session.email.split('@')[0],
            email: session.email,
            name: session.name,
            password: hashed,
            teamRole: session.teamRole,
            linkedWorkspaceOwnerId: session.linkedWorkspaceOwnerId,
          })
        }
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
      if (/Invalid email or password/i.test(msg)) throw e
      console.warn('[cloudLogin] cloud failed, trying local', msg)
      if (toast && /waking|offline|Network|502|503/i.test(msg)) {
        toast('Cloud waking up — trying local login…', 'info')
      }
    }
  }

  const users = (await db.getAll(STORES.users)) || []
  const needle = email
  const local = users.find((x) => {
    const un = String(x.username || '').trim().toLowerCase()
    const em = String(x.email || '').trim().toLowerCase()
    return un === needle || em === needle || un === raw.toLowerCase()
  })
  if (!local) {
    if (!canUseCloudSync()) {
      throw new Error('No local account. Turn Solo mode off and sign in with your cloud email.')
    }
    throw new Error('Invalid email or password')
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
  const name = form?.name || email.split('@')[0]
  if (!email || !password) throw new Error('Email and password required')
  if (!canUseCloudSync()) {
    throw new Error('Solo offline mode is on — turn it off in Settings to create a cloud account')
  }
  if (online === false) throw new Error('You are offline — connect to register a cloud account')

  const data = await Sync.register(email, password, name)
  const u = data.user || { email, name }
  const session = {
    id: u.id,
    email: u.email || email,
    name: u.name || name,
    cloud: true,
  }
  setSession?.(session)
  setUser?.(session)

  try {
    const hashed = await hashPassword(password)
    await db.put(STORES.users, {
      id: session.id || (crypto.randomUUID?.() || 'u_' + Date.now()),
      username: email.split('@')[0],
      email,
      name: session.name,
      password: hashed,
    })
  } catch (e) {
    console.warn('[cloudRegister] local mirror', e?.message || e)
  }

  try {
    await ensureWorkspaceSynced({ forcePush: true })
  } catch {}
  if (refresh) await refresh()
  if (toast) toast('Account created — cloud sync enabled', 'success')
  return { cloud: true, user: session }
}
