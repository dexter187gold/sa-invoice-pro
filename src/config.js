export const APP_VERSION = '6.39.1'
export const APP_NAME = 'SA Invoice Pro'
export const APP_COPYRIGHT = '© SA Invoice Pro. All rights reserved.'
export const APP_CODENAME = '6.39.1 · Nav restored · Dev portal'
export const OLIVE_REPO = 'https://github.com/dexter187gold/olive-yellow-reef-quartz'

export const HELIX_ROUTES = {
  desk: '/desk', tickets: '/desk/tickets', inbox: '/desk/inbox', clients: '/desk/clients',
  channels: '/desk/channels', knowledge: '/desk/knowledge', reports: '/desk/reports',
  portal: '/portal', login: '/login',
}

export const VAT_RATE_DEFAULT = 0.15
export const SUPPORT_RATES_DEFAULT = { onsite: 450, remote: 300 }

export const APP_LINKS = {
  licenseServer: 'https://sa-invoice-license.onrender.com',
  licenseDashboard: 'https://sa-invoice-license.onrender.com/',
  updatesServer: 'https://sa-invoice-updates.onrender.com',
  syncServer: 'https://saip-sync.onrender.com',
  website: 'https://github.com/dexter187gold/sa-invoice-pro-website',
  productEmail: 'sainvoicepro@gmail.com',
  repo: 'https://github.com/dexter187gold/sa-invoice-pro',
  syncRepo: 'https://github.com/dexter187gold/saip-sync',
  devPortalPath: '/dev-portal',
}

export const SA_CONFIG = {
  appVersion: APP_VERSION,
  defaultLicenseServerUrl: APP_LINKS.licenseServer,
  syncServerUrl: APP_LINKS.syncServer,
  syncEnabled: true,
  helixUrl: '',
  helixPathDesk: HELIX_ROUTES.tickets,
  helixEmbedTickets: false,
  oliveRepo: OLIVE_REPO,
  helixRoutes: HELIX_ROUTES,
  vatRateDefault: VAT_RATE_DEFAULT,
  productEmail: APP_LINKS.productEmail,
  updatesServerUrl: APP_LINKS.updatesServer,
}

export const DOC_TYPES = [
  { id: 'sla', label: 'Service Level Agreement' },
  { id: 'consulting', label: 'Consulting engagement letter' },
  { id: 'tax_clearance_support', label: 'Letter of good standing / tax support' },
  { id: 'quote_letter', label: 'Formal quotation letter' },
  { id: 'popia_notice', label: 'POPIA privacy notice' },
  { id: 'invoice_cover', label: 'Tax invoice cover letter' },
  { id: 'job_card', label: 'Job card summary' },
  { id: 'nda', label: 'Non-disclosure agreement (lite)' },
  { id: 'terms', label: 'Standard terms of business' },
]
