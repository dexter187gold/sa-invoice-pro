import * as db from './db'

const KEY = 'white_label'

export const DEFAULT_WL = {
  enabled: false,
  brandName: '',
  supportEmail: '',
  supportPhone: '',
  portalDomain: '',
  hidePoweredBy: false,
  primaryColor: '',
}

export async function getWhiteLabel() {
  const v = (await db.getSetting(KEY)) || {}
  return { ...DEFAULT_WL, ...v }
}

export async function saveWhiteLabel(patch) {
  const cur = await getWhiteLabel()
  const next = { ...cur, ...patch }
  await db.setSetting(KEY, next)
  return next
}
