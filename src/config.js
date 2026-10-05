export const APP_VERSION = '2.3.0'
export const APP_NAME = 'SA Invoice Pro'
export const APP_COPYRIGHT = '© SA Invoice Pro. All rights reserved.'

export const SA_CONFIG = {
  appVersion: APP_VERSION,
  defaultLicenseServerUrl: 'https://sa-invoice-license.onrender.com',
  helixUrl: (typeof window !== 'undefined' && window.SA_CONFIG?.helixUrl) || '',
  helixPathDesk: '/desk/tickets',
  helixEmbedTickets: true,
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
