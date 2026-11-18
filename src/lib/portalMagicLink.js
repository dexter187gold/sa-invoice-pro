/**
 * Build shareable portal magic-link text + optional server issue.
 */
import { Sync } from './sync.js'

export async function issuePortalMagicLink(client, { days = 90 } = {}) {
  if (!client?.id) throw new Error('Client required')
  if (!Sync.isLoggedIn()) throw new Error('Sign in to cloud under Settings first')
  const data = await Sync.createPortalLink(client.id, { days })
  let pinInfo = null
  const email = String(client.email || '').trim().toLowerCase()
  if (email.includes('@') && Sync.issueClientPortalLogin) {
    try {
      pinInfo = await Sync.issueClientPortalLogin({
        clientId: client.id,
        email,
        name: client.name || email,
        phone: client.phone || '',
      })
    } catch (e) {
      console.warn('[magic-link] pin issue', e?.message || e)
    }
  }
  const url = data?.url || pinInfo?.url || ''
  const pin = pinInfo?.pin || pinInfo?.account?.pin || pinInfo?.temporaryPin
  const user = pinInfo?.username || pinInfo?.email || email
  const message = pin
    ? `Your client portal (valid ~${days} days)\n${url}\nLogin: ${user}\nPIN: ${pin}\nOr open the link on this device for one-tap access.`
    : `Your client portal (valid ~${days} days)\n${url}`
  return { url, pin, username: user, message, raw: data, pinInfo }
}
