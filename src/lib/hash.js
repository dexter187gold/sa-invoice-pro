/** Browser-safe password hashing with dual algorithms for cross-device login. */

/** SHA-256 hex when Web Crypto is available (HTTPS / secure context). */
export async function hashSha256(password) {
  const str = String(password || '')
  if (typeof crypto === 'undefined' || !crypto.subtle?.digest) return null
  try {
    const enc = new TextEncoder().encode(str)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/** FNV-style fallback used on non-secure contexts / older WebViews. */
export function hashFallback(password) {
  const str = String(password || '')
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let h2 = 0
  for (let i = 0; i < str.length; i++) {
    h2 = (h2 << 5) - h2 + str.charCodeAt(i)
    h2 |= 0
  }
  return 'fb_' + (h >>> 0).toString(16) + '_' + (h2 >>> 0).toString(16) + '_' + str.length
}

/** Preferred hash for NEW passwords (SHA-256 if available, else fallback). */
export async function hashPassword(password) {
  const sha = await hashSha256(password)
  if (sha) return sha
  return hashFallback(password)
}

/** True if stored value looks like a hash (not legacy plaintext). */
export function looksHashed(stored) {
  const s = String(stored || '')
  if (s.startsWith('fb_')) return true
  if (/^[a-f0-9]{64}$/i.test(s)) return true
  return false
}

/**
 * Verify password against stored value.
 * Tries SHA-256, fallback hash, and plaintext (legacy) so login works
 * across web HTTPS, HTTP, and Capacitor APK WebViews.
 */
export async function verifyPassword(password, stored) {
  const s = String(stored || '')
  if (!s) return false
  if (!looksHashed(s) && s === String(password || '')) return true
  const sha = await hashSha256(password)
  if (sha && sha === s) return true
  if (hashFallback(password) === s) return true
  return false
}
