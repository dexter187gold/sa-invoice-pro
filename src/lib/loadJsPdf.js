/**
 * Reliable jsPDF loader for Vite + Capacitor / Android WebView.
 * Always returns the constructor function (never a module object).
 */
export async function loadJsPdf() {
  const mod = await import('jspdf')
  let jsPDF =
    (typeof mod.jsPDF === 'function' && mod.jsPDF) ||
    (typeof mod.default === 'function' && mod.default) ||
    (mod.default && typeof mod.default.jsPDF === 'function' && mod.default.jsPDF) ||
    null

  // Some bundlers attach the class on default.default
  if (!jsPDF && mod.default && mod.default.default && typeof mod.default.default === 'function') {
    jsPDF = mod.default.default
  }

  if (typeof jsPDF !== 'function') {
    console.error('jspdf module shape', mod, Object.keys(mod || {}))
    throw new Error(
      'jsPDF is not a constructor (module interop failed). Reinstall jspdf or rebuild the APK.'
    )
  }
  return jsPDF
}
