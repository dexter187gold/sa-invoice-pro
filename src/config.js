export const APP_VERSION = '2.4.2'
export const APP_NAME = 'SA Invoice Pro'
export const APP_COPYRIGHT = '© SA Invoice Pro. All rights reserved.'
export const OLIVE_REPO = 'https://github.com/dexter187gold/olive-yellow-reef-quartz'

/** Real Helix (olive-yellow-reef-quartz) desk routes */
export const HELIX_ROUTES = {
  desk: '/desk',
  tickets: '/desk/tickets',
  inbox: '/desk/inbox',
  clients: '/desk/clients',
  channels: '/desk/channels',
  knowledge: '/desk/knowledge',
  reports: '/desk/reports',
  portal: '/portal',
  login: '/login',
}

export const SA_CONFIG = {
  appVersion: APP_VERSION,
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  // Set after you deploy Helix (Vercel / Cloudflare Pages). Also editable in Settings → Integrations.
  helixUrl: (typeof window !== 'undefined' && window.SA_CONFIG?.helixUrl) || '',
  helixPathDesk: HELIX_ROUTES.tickets,
  helixEmbedTickets: true,
  oliveRepo: OLIVE_REPO,
  helixRoutes: HELIX_ROUTES,
}

export const VAT_RATE_DEFAULT = 0.15

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
