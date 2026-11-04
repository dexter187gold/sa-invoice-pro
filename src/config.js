export const APP_VERSION = '6.56.0'
export const APP_NAME = 'SA Invoice Pro'
export const APP_COPYRIGHT = '© SA Invoice Pro. All rights reserved.'
export const APP_CODENAME = '6.56.0 · Seats dual-rail · White-label pilot UI'
export const OLIVE_REPO = 'https://github.com/dexter187gold/olive-yellow-reef-quartz'

export const DEFAULT_VAT_RATE = 0.15
export const VAT_RATE_DEFAULT = DEFAULT_VAT_RATE

export const SUPPORT_EMAIL = 'sainvoicepro@gmail.com'
export const PRODUCT_EMAIL = 'sainvoicepro@gmail.com'

export const CLIENT_PORTAL_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLIENT_PORTAL_URL) ||
  'https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev'

export const SYNC_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SYNC_API_URL) ||
  'https://saip-sync.onrender.com'

export const LICENSE_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LICENSE_API_URL) ||
  'https://saip-license.onrender.com'

export const EDGE_PROXY_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EDGE_PROXY_URL) ||
  ''

export const DEV_PORTAL_PATH = '/dev-portal'

export const PAYFAST_SANDBOX =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYFAST_SANDBOX) !== 'false'

export function publicLinks() {
  return {
    app: typeof window !== 'undefined' ? window.location.origin : '',
    clientPortal: CLIENT_PORTAL_URL,
    syncApi: SYNC_API_URL,
    licenseApi: LICENSE_API_URL,
    edgeProxy: EDGE_PROXY_URL,
    website: 'https://sa-invoice-pro.pages.dev',
    supportEmail: SUPPORT_EMAIL,
  }
}

export const APP_LINKS = {
  syncServer: SYNC_API_URL,
  licenseServer: LICENSE_API_URL,
  updatesServer: LICENSE_API_URL,
  clientPortal: CLIENT_PORTAL_URL,
  website: 'https://sa-invoice-pro.pages.dev',
  edgeProxy: EDGE_PROXY_URL,
  supportEmail: SUPPORT_EMAIL,
}

export const SA_CONFIG = {
  appVersion: APP_VERSION,
  productEmail: PRODUCT_EMAIL,
  supportEmail: SUPPORT_EMAIL,
  syncServerUrl: SYNC_API_URL,
  defaultLicenseServerUrl: LICENSE_API_URL,
  clientPortalUrl: CLIENT_PORTAL_URL,
  website: APP_LINKS.website,
  payfastSandbox: PAYFAST_SANDBOX,
}
