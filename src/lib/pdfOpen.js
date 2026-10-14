/**
 * Capacitor / Android WebView-safe PDF open + download.
 */
function isNative() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'android')
  } catch {
    return false
  }
}

export function revokeLater(url, ms = 120000) {
  setTimeout(() => { try { URL.revokeObjectURL(url) } catch {} }, ms)
}

export function showInAppPdfViewer(url, name = 'document.pdf') {
  const existing = document.getElementById('sa-pdf-viewer')
  if (existing) existing.remove()
  const wrap = document.createElement('div')
  wrap.id = 'sa-pdf-viewer'
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-label', 'PDF preview')
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(8,6,16,.92);display:flex;flex-direction:column;font-family:system-ui,sans-serif;'
  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;background:#0c0a14;color:#f0e6ff;flex-shrink:0;border-bottom:1px solid rgba(232,121,249,.35);'
  bar.innerHTML = `<strong style="flex:1;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</strong>`
  const dl = document.createElement('button')
  dl.type = 'button'; dl.textContent = 'Download'
  dl.style.cssText = 'background:transparent;color:#e879f9;border:1px solid rgba(232,121,249,.5);border-radius:8px;padding:8px 12px;font-weight:600;font-size:13px;'
  dl.onclick = () => downloadBlobUrl(url, name)
  const shareBtn = document.createElement('button')
  shareBtn.type = 'button'; shareBtn.textContent = 'Share'
  shareBtn.style.cssText = 'background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,.5);border-radius:8px;padding:8px 12px;font-weight:600;font-size:13px;'
  shareBtn.onclick = () => sharePdf(url, name)
  const close = document.createElement('button')
  close.type = 'button'; close.textContent = 'Close'
  close.style.cssText = 'background:#e879f9;color:#0c0a14;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;'
  close.onclick = () => wrap.remove()
  bar.appendChild(dl); bar.appendChild(shareBtn); bar.appendChild(close)
  const frame = document.createElement('iframe')
  frame.title = 'PDF preview'; frame.src = url
  frame.style.cssText = 'flex:1;width:100%;border:0;background:#1a1625;'
  const note = document.createElement('div')
  note.style.cssText = 'padding:10px 14px;background:#161222;color:rgba(240,230,255,.75);font-size:12px;flex-shrink:0;'
  note.textContent = 'If the preview is blank, tap Download or Share — the PDF is ready.'
  wrap.appendChild(bar); wrap.appendChild(frame); wrap.appendChild(note)
  document.body.appendChild(wrap)
  return wrap
}

export async function blobFromUrl(url) {
  const res = await fetch(url)
  return res.blob()
}

export async function downloadBlobUrl(url, name) {
  if (isNative()) {
    try { await sharePdf(url, name); return } catch (e) { console.warn('native share failed', e) }
  }
  try {
    const a = document.createElement('a')
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none'
    document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 800)
  } catch (e) { console.warn(e) }
  try { if (isNative()) window.location.href = url } catch {}
}

export async function sharePdf(url, name) {
  const blob = await blobFromUrl(url)
  const file = new File([blob], name, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: name }); return
  }
  if (navigator.share) {
    try { await navigator.share({ title: name, url }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  try {
    const { Share } = await import('@capacitor/share')
    const reader = new FileReader()
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    await Share.share({ title: name, text: name, url: String(dataUrl), dialogTitle: 'Share PDF' })
    return
  } catch {}
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
}

export async function openJsPdf(doc, name = 'document.pdf') {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  revokeLater(url)
  showInAppPdfViewer(url, name)
  return url
}

export async function downloadJsPdf(doc, name = 'document.pdf') {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  revokeLater(url, 60000)
  await downloadBlobUrl(url, name)
  showInAppPdfViewer(url, name)
  return name
}
