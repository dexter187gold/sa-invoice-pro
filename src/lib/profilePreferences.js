const identityFor = (user) => String(user?.id || user?.email || user?.username || 'local').trim().toLowerCase()

export function profilePrefsStorageKey(user) {
  return 'sa_profile_prefs_v1:' + encodeURIComponent(identityFor(user))
}

export function readProfilePrefs(user) {
  try {
    const value = JSON.parse(localStorage.getItem(profilePrefsStorageKey(user)) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function saveProfilePrefs(user, patch) {
  const next = { ...readProfilePrefs(user), ...(patch || {}), updatedAt: new Date().toISOString() }
  try { localStorage.setItem(profilePrefsStorageKey(user), JSON.stringify(next)) } catch {}
  return next
}
