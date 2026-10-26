/**
 * PDF branding helpers — white-label logo + accent for invoice/quote PDFs.
 */
import { brandLogoDataUrl, loadWhiteLabel, displayAppName } from './whiteLabel.js'
import { APP_NAME } from '../config.js'

/** Parse #RRGGBB or rgb to [r,g,b] 0–255 for jsPDF. */
export function hexToRgb(hex, fallback = [0, 122, 77]) {
  const h = String(hex || '').trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function pdfBrandMeta() {
  const wl = loadWhiteLabel()
  const logo = brandLogoDataUrl()
  const accent = hexToRgb(wl.accent, [0, 122, 77])
  const name = displayAppName(APP_NAME)
  return {
    logoDataUrl: logo,
    accentRgb: accent,
    brandName: name,
    hidePoweredBy: !!wl.hidePoweredBy,
  }
}

/**
 * Draw logo (if any) top-left; returns y offset after logo block.
 * @param {import('jspdf').jsPDF} doc
 */
export function drawPdfLogo(doc, { x = 14, y = 10, maxH = 16, maxW = 28 } = {}) {
  const { logoDataUrl } = pdfBrandMeta()
  if (!logoDataUrl || !logoDataUrl.startsWith('data:image')) return y
  try {
    const fmt = logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'
    doc.addImage(logoDataUrl, fmt, x, y, maxW, maxH)
    return y + maxH + 2
  } catch {
    return y
  }
}

export function pdfFooterLine(meta = pdfBrandMeta()) {
  if (meta.hidePoweredBy) return `${meta.brandName}`
  return `${meta.brandName} · powered by SA Invoice Pro`
}
