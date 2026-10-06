/** Invoice layout defaults + load/save (IndexedDB settings + localStorage cache) */
import * as db from './db.js'

export const LAYOUT_KEY = 'invoiceLayout'

export const DEFAULT_LAYOUT = {
  formDensity: 'comfortable',
  formFontSize: 14,
  showLayoutPanel: true,
  pdfFontSize: 9,
  pdfTitleSize: 14,
  headerStyle: 'modern',
  defaultTemplateId: 'standard',
  showClientGrid: true,
  showDevices: true,
  showServiceType: true,
  showTerms: true,
  showAcceptance: true,
  showBankDetails: true,
  footerText: '',
  defaultNotes: '',
  defaultPaymentNote: '',
  accentHex: '#007A4D',
  marginMm: 14,
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
