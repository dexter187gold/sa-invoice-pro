/** App shell layout modes */
const KEY = 'saip_ui_layout'

export const LAYOUT_MODES = [
  { id: 'modern', label: 'Modern (current)', hint: 'Orb / bottom nav + dense cards' },
  { id: 'traditional', label: 'Traditional invoice desk', hint: 'Side nav, classic list → detail for invoices & jobs' },
]

export function readUiLayout() {
  try {
    const v = localStorage.getItem(KEY) || 'modern'
    return v === 'traditional' ? 'traditional' : 'modern'
  } catch {
    return 'modern'
  }
}

export function saveUiLayout(mode) {
  const next = mode === 'traditional' ? 'traditional' : 'modern'
  try {
    localStorage.setItem(KEY, next)
  } catch {}
  try {
    document.documentElement.dataset.uiLayout = next
    document.documentElement.classList.toggle('layout-traditional', next === 'traditional')
    document.documentElement.classList.toggle('layout-modern', next === 'modern')
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('sa-ui-layout', { detail: { mode: next } }))
  } catch {}
  return next
}

export function applyUiLayoutOnBoot() {
  return saveUiLayout(readUiLayout())
}
