import * as db from './db'
import { STORES } from './db'
import { hashPassword, verifyPassword } from './hash'
import { Sync } from './sync'
import { canUseCloudSync } from './soloMode'
import { ensureWorkspaceSynced, describeEnsureResult } from './workspaceSync'

export async function mirrorLocalUser(cloudUser, password) {
  const email = String(cloudUser?.email || '').trim().toLowerCase()
  if (!email) return null
  const users = (await db.getAll(STORES.users)) || []
  let u = users.find((x) => String(x.email || '').trim().toLowerCase() === email)
  const hashed = password ? await hashPassword(password) : null
  if (u) {
    const patch = { ...u, name: cloudUser.name || u.name, cloudId: cloudUser.id || u.cloudId, email }
    if (hashed) patch.password = hashed
    await db.put(STORES.users, patch)
    return patch
  }
  return await db.add(STORES.users, {
    username: email.split('@')[0] || email,
    email,
    password: hashed || 'cloud-only',
    name: cloudUser.name || email.split('@')[0],
    cloudId: cloudUser.id,
  })
}

export async function cloudLogin(username, password, { online, toast, setSession, setUser, refresh, skipAutoPush }) {
  const needle = String(username || '').trim().toLowerCase()
  if (!needle) throw new Error('Enter email (or username)')
  if (!password) throw new Error('Enter password')

  if (canUseCloudSync() && online !== false) {
    try {
      const cloud = await Sync.login(needle, password)
      const cu = cloud.user || { email: needle }
      await mirrorLocalUser(cu, password)
      const session = {
        id: cu.id || cu.email,
        username: (cu.email || needle).split('@')[0],
        email: cu.email || needle,
        name: cu.name || cu.email || needle,
        cloud: true,
      }
      setSession(session)
      setUser(session)
      let ensure = null
      try { ensure = await ensureWorkspaceSynced() } catch (e) { console.warn('[login] ensure', e.message || e) }
      if (skipAutoPush) skipAutoPush.current = true
      await refresh()
      if (skipAutoPush) skipAutoPush.current = false
      if (ensure && toast) toast(describeEnsureResult(ensure), ensure.ok ? 'success' : 'info')
      else if (toast) toast('Signed in — sync will retry in the background', 'info')
      return session
    } catch (cloudErr) {
      const users = (await db.getAll(STORES.users)) || []
      if (!users.length) {
        throw new Error(cloudErr.message || 'Cloud sign-in failed. Use your registered email, or Create account.')
      }
      console.warn('[login] cloud failed, trying local', cloudErr.message || cloudErr)
    }
  }

  const users = (await db.getAll(STORES.users)) || []
  const u = users.find((x) => {
    const un = String(x.username || '').trim().toLowerCase()
    const em = String(x.email || '').trim().toLowerCase()
    return un === needle || em === needle
  })
  if (!u) {
    if (!users.length) throw new Error('No profile on this device. Sign in with your cloud email, or Create account.')
    throw new Error('Invalid email or password')
  }
  const ok = await verifyPassword(password, u.password)
  if (!ok) throw new Error('Invalid email or password')
  try {
    const preferred = await hashPassword(password)
    if (preferred && preferred !== u.password) await db.put(STORES.users, { ...u, password: preferred })
  } catch {}
  const session = { id: u.id, username: u.username, email: u.email, name: u.name, cloud: false }
  setSession(session)
  setUser(session)
  await refresh()
  if (canUseCloudSync() && u.email && String(u.email).includes('@')) {
    Sync.login(u.email, password).then(() => ensureWorkspaceSynced()).catch(() => {})
  }
  return session
}

export async function cloudRegister({ username, email, password, name }, { online, toast, setSession, setUser, refresh }) {
  const em = String(email || '').trim().toLowerCase()
  const un = String(username || em.split('@')[0] || '').trim()
  if (!em || !em.includes('@')) throw new Error('A valid email is required (used to restore on any device)')
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must include letters and numbers')
  }

  let cloudUser = null
  if (canUseCloudSync() && online !== false) {
    try {
      const cloud = await Sync.register(em, password, name || un)
      cloudUser = cloud.user || { email: em, name: name || un }
    } catch (e) {
      const msg = String(e.message || e)
      if (msg.toLowerCase().includes('already')) {
        try {
          const cloudLogin = await Sync.login(em, password)
          cloudUser = cloudLogin.user || { email: em, name: name || un }
        } catch {
          throw new Error('Email already registered. Sign in with the same password instead.')
        }
      } else {
        throw new Error(msg || 'Cloud registration failed')
      }
    }
  }

  const users = (await db.getAll(STORES.users)) || []
  const existing = users.find((u) => String(u.email || '').toLowerCase() === em)
  if (existing) {
    const hashed = await hashPassword(password)
    await db.put(STORES.users, {
      ...existing,
      password: hashed,
      name: name || existing.name || un,
      cloudId: cloudUser?.id || existing.cloudId,
    })
  } else {
    await mirrorLocalUser(cloudUser || { email: em, name: name || un }, password)
  }

  const session = {
    id: cloudUser?.id || em,
    username: un,
    email: em,
    name: name || un,
    cloud: !!cloudUser,
  }
  setSession(session)
  setUser(session)

  if (cloudUser && canUseCloudSync()) {
    try {
      const ensure = await ensureWorkspaceSynced({ forcePush: true })
      if (toast) toast(describeEnsureResult(ensure) || 'Account created · profile saved to cloud', 'success')
    } catch {
      if (toast) toast('Account created · cloud upload will retry when online', 'info')
    }
  }

  await refresh()
  return session
}
