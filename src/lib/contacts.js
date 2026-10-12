/**
 * Android / Chrome Contact Picker API helpers.
 * Works in secure contexts (HTTPS / localhost) when the browser supports it.
 */

export function contactsPickerSupported() {
  try {
    return typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window
  } catch {
    return false
  }
}

/**
 * Open the device contact picker and return normalized client-shaped objects.
 * @param {{ multiple?: boolean }} opts
 * @returns {Promise<Array<{ name: string, phone: string, email: string }>>}
 */
export async function pickContactsFromPhone({ multiple = true } = {}) {
  if (!contactsPickerSupported()) {
    throw new Error('Contact picker not supported on this browser. Use Chrome/Edge on Android, or add clients manually.')
  }
  const props = ['name', 'tel', 'email']
  const opts = { multiple: !!multiple }
  const selected = await navigator.contacts.select(props, opts)
  if (!selected?.length) return []

  return selected.map((c) => {
    const name = Array.isArray(c.name) ? (c.name[0] || '') : (c.name || '')
    const phone = Array.isArray(c.tel) ? (c.tel[0] || '') : (c.tel || '')
    const email = Array.isArray(c.email) ? (c.email[0] || '') : (c.email || '')
    return {
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
    }
  }).filter((c) => c.name || c.phone || c.email)
}

export function normalizeSaPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length === 10) d = '27' + d.slice(1)
  return d ? (d.startsWith('27') ? '+' + d : phone) : String(phone || '').trim()
}
