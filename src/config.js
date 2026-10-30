export const APP_VERSION = '6.45.0'
export const APP_NAME = 'SA Invoice Pro'
export const APP_COPYRIGHT = '© SA Invoice Pro. All rights reserved.'
export const APP_CODENAME = '6.45.0 · Credit modal UI · portal sync'
export const OLIVE_REPO = 'https://github.com/dexter187gold/olive-yellow-reef-quartz'

export const DEFAULT_VAT_RATE = 0.15
export const SUPPORT_EMAIL = 'sainvoicepro@gmail.com'
export const PRODUCT_EMAIL = 'sainvoicepro@gmail.com'

/** Public marketing / client portal (Cloudflare Worker) */
export const CLIENT_PORTAL_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLIENT_PORTAL_URL) ||
  'https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev'

/** Desk cloud sync (Render free tier) */
export const SYNC_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SYNC_API_URL) ||
  'https://saip-sync.onrender.com'

/** License / activation server */
export const LICENSE_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LICENSE_API_URL) ||
  'https://saip-license.onrender.com'

/** Dev portal (secrets vault) — restricted */
export const DEV_PORTAL_PATH = '/dev-portal'

export const PAYFAST_SANDBOX =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYFAST_SANDBOX) !== 'false'

export function publicLinks() {
  return {
    app: typeof window !== 'undefined' ? window.location.origin : '',
    clientPortal: CLIENT_PORTAL_URL,
    syncApi: SYNC_API_URL,
    licenseApi: LICENSE_API_URL,
    supportEmail: SUPPORT_EMAIL,
  }
}

/** Canonical public endpoints (also used by devConfig / tests). */
export const APP_LINKS = {
  syncServer: SYNC_API_URL,
  licenseServer: LICENSE_API_URL,
  updatesServer: LICENSE_API_URL,
  clientPortal: CLIENT_PORTAL_URL,
  website: 'https://sa-invoice-pro-website.pages.dev',
  supportEmail: SUPPORT_EMAIL,
}
