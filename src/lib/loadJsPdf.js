/**
 * Reliable jsPDF dynamic import for Vite ESM builds.
 * Handles named export, default export, and nested default interop.
 */
export async function loadJsPdf() {
  const mod = await import('jspdf')
  const jsPDF =
    mod.jsPDF ||
    (mod.default && mod.default.jsPDF) ||
    mod.default ||
    null
  if (typeof jsPDF !== 'function') {
    throw new Error(
      'jsPDF failed to load. Rebuild the app (npm run build) or check that the jspdf package is installed.'
    )
  }
  return jsPDF
}
