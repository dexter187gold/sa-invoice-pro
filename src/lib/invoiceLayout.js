/** Simple invoice preferences (saved to IndexedDB + localStorage) */
import * as db from './db.js'

export const LAYOUT_KEY = 'invoiceLayout'

export const DEFAULT_LAYOUT = {
  formDensity: 'comfortable',
  formFontSize: 14,
  showJobBlock: true,
  showBankBlock: true,
  showPaymentBlock: true,
  defaultTemplateId: 'standard',
  defaultAccountType: 'COD Account',
  defaultNotes: 'Thank you for your business.',
  defaultPaymentNote: 'Payment due as stated. EFT, cash or card as arranged.',
  defaultDueDays: 7,
  showPo: true,
  showSite: true,
  showTech: true,
  showSerials: true,
  showDevices: true,
  showServiceType: true,
  showTerms: true,
  showAcceptance: true,
  showBankDetails: true,
  showClientGrid: true,
  headerStyle: 'modern',
  accentHex: '#007A4D',
  pdfFontSize: 9,
  pdfTitleSize: 14,
  marginMm: 14,
  footerText: '',
  showLayoutPanel: true,
  paper: 'a4',
}

export function mergeLayout(partial) {
  return { ...DEFAULT_LAYOUT, ...(partial || {}) }
}

export async function loadInvoiceLayout() {
  try {
    const fromDb = await db.getSetting(LAYOUT_KEY, null)
    if (fromDb && typeof fromDb === 'object') {
      const m = mergeLayout(fromDb)
      try { localStorage.setItem('sa_invoice_layout', JSON.stringify(m)) } catch {}
      return m
    }
  } catch {}
  try {
    const raw = localStorage.getItem('sa_invoice_layout')
    if (raw) return mergeLayout(JSON.parse(raw))
  } catch {}
  return { ...DEFAULT_LAYOUT }
}

export async function saveInvoiceLayout(layout) {
  const m = mergeLayout(layout)
  await db.setSetting(LAYOUT_KEY, m)
  try { localStorage.setItem('sa_invoice_layout', JSON.stringify(m)) } catch {}
  return m
}

export function hexToRgb(hex) {
  const h = String(hex || '#007A4D').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [0, 122, 77]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
