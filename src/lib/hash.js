/** Browser-safe SHA-256 hex digest (matches legacy style for new accounts). */
export async function hashPassword(password) {
  const str = String(password || '')
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const enc = new TextEncoder().encode(str)
      const buf = await crypto.subtle.digest('SHA-256', enc)
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch (e) {
    console.warn('subtle digest failed, using fallback hash', e)
  }
  // FNV-1a style fallback (HTTP / non-secure contexts)
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

/** True if stored value looks like a hash (not legacy plaintext). */
export function looksHashed(stored) {
  const s = String(stored || '')
  if (s.startsWith('fb_')) return true
  if (/^[a-f0-9]{64}$/i.test(s)) return true
  return false
}
