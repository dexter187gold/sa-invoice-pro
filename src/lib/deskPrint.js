/** Batch Q — print / PDF desk helpers */
export function cssPageA4() {
  return '@page { size: A4; margin: 12mm; } body { font-family: system-ui, sans-serif; }'
}
export function printWindow(html, title = 'Print') {
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return false
  w.document.write(`<!doctype html><html><head><title>${title}</title></head><body>${html}</body></html>`)
  w.document.close()
  try {
    w.focus()
    w.print()
  } catch {}
  return true
}
export function invoicePrintTitle(inv) {
  return `Invoice ${inv?.number || inv?.id || ''}`
}
export function quotePrintTitle(q) {
  return `Quote ${q?.number || q?.id || ''}`
}
export function ticketPrintTitle(t) {
  return `Job ${t?.title || t?.id || ''}`
}
export function wrapPrintHtml(body, title) {
  return `<style>${cssPageA4()}</style><h1>${title || ''}</h1>${body}`
}
export function linesToHtml(lines) {
  return `<table><tbody>${(lines || [])
    .map((l) => `<tr><td>${l.description || ''}</td><td>${l.qty || ''}</td><td>${l.price || ''}</td></tr>`)
    .join('')}</tbody></table>`
}
export function moneyCell(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v.toFixed(2) : '—'
}
export function shouldHideZeroLines(lines) {
  return (lines || []).filter((l) => (Number(l.qty) || 0) * (Number(l.price) || 0) !== 0)
}
export function filenamePdf(prefix, number) {
  const n = String(number || 'doc').replace(/[^\w.-]+/g, '_')
  return `${prefix}-${n}.pdf`
}
export function blobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
export function DESKPRINT_COUNT() {
  return 12
}
export const DESKPRINT_VERSION = 1
