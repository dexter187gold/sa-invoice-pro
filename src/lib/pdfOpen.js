/**
 * Capacitor / Android WebView-safe PDF open + download.
 * Always prefers in-app viewer; native share / Filesystem when available.
 * Never relies on window.open (blocked in WebView).
 */

function isNative() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'android')
  } catch {
    return false
  }
}

export function revokeLater(url, ms = 180000) {
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {}
  }, ms)
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result || '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Write PDF to device storage via Capacitor Filesystem when available. */
async function saveViaFilesystem(blob, name) {
  try {
    const Filesystem = window.Capacitor?.Plugins?.Filesystem
    if (!Filesystem?.writeFile) return false
    const data = await blobToBase64(blob)
    const dirs = ['CACHE', 'DATA', 'EXTERNAL', 'DOCUMENTS', 'EXTERNAL_STORAGE']
    for (const directory of dirs) {
      try {
        await Filesystem.writeFile({
          path: name,
          data,
          directory,
          recursive: true,
        })
        return true
      } catch {
        /* try next */
      }
    }
  } catch (e) {
    console.warn('Filesystem PDF save failed', e)
  }
  return false
}

export function showInAppPdfViewer(url, name = 'document.pdf') {
  const existing = document.getElementById('sa-pdf-viewer')
  if (existing) existing.remove()

  const wrap = document.createElement('div')
  wrap.id = 'sa-pdf-viewer'
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-label', 'PDF preview')
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;background:rgba(8,6,16,.94);display:flex;flex-direction:column;font-family:system-ui,Segoe UI,sans-serif;'

  const bar = document.createElement('div')
  bar.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0c0a14;color:#f0e6ff;flex-shrink:0;border-bottom:1px solid rgba(232,121,249,.35);flex-wrap:wrap;'
  const title = document.createElement('strong')
  title.style.cssText =
    'flex:1;min-width:120px;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
  title.textContent = name
  bar.appendChild(title)

  const btnStyle =
    'border-radius:8px;padding:8px 12px;font-weight:600;font-size:13px;cursor:pointer;'

  const dl = document.createElement('button')
  dl.type = 'button'
  dl.textContent = 'Download'
  dl.style.cssText = btnStyle + 'background:transparent;color:#e879f9;border:1px solid rgba(232,121,249,.5);'
  dl.onclick = () => downloadBlobUrl(url, name)

  const shareBtn = document.createElement('button')
  shareBtn.type = 'button'
  shareBtn.textContent = 'Share'
  shareBtn.style.cssText = btnStyle + 'background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,.5);'
  shareBtn.onclick = () => sharePdf(url, name)

  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Close'
  close.style.cssText = btnStyle + 'background:#e879f9;color:#0c0a14;border:0;'
  close.onclick = () => wrap.remove()

  bar.appendChild(dl)
  bar.appendChild(shareBtn)
  bar.appendChild(close)

  const frame = document.createElement('iframe')
  frame.title = 'PDF preview'
  frame.src = url
  frame.style.cssText = 'flex:1;width:100%;border:0;background:#1a1625;'

  const note = document.createElement('div')
  note.style.cssText =
    'padding:10px 14px;background:#161222;color:rgba(240,230,255,.8);font-size:12px;flex-shrink:0;'
  note.textContent = isNative()
    ? 'Tap Share to save or send the PDF. Preview may be blank on some Android WebViews — Share still works.'
    : 'If the preview is blank, use Download or Share — the PDF is ready.'

  wrap.appendChild(bar)
  wrap.appendChild(frame)
  wrap.appendChild(note)
  document.body.appendChild(wrap)
  return wrap
}

export async function blobFromUrl(url) {
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const res = await fetch(url)
    return res.blob()
  }
  const res = await fetch(url)
  return res.blob()
}

export async function downloadBlobUrl(url, name = 'document.pdf') {
  let blob
  try {
    blob = await blobFromUrl(url)
  } catch (e) {
    console.warn('blobFromUrl failed', e)
  }

  if (blob && isNative()) {
    const saved = await saveViaFilesystem(blob, name)
    if (saved) {
      try {
        await sharePdf(url, name)
      } catch {}
      return
    }
    try {
      await sharePdf(url, name)
      return
    } catch (e) {
      console.warn('native share failed', e)
    }
  }

  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => a.remove(), 1000)
  } catch (e) {
    console.warn(e)
  }

  if (isNative()) {
    try {
      window.open(url, '_blank')
    } catch {}
  }
}

export async function sharePdf(url, name = 'document.pdf') {
  let blob
  try {
    blob = await blobFromUrl(url)
  } catch {
    blob = null
  }

  if (blob) {
    try {
      const file = new File([blob], name, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: name, text: name, url })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }

  try {
    const Share = window.Capacitor?.Plugins?.Share
    if (Share?.share && blob) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      await Share.share({
        title: name,
        text: name,
        url: String(dataUrl),
        dialogTitle: 'Share PDF',
      })
      return
    }
  } catch (e) {
    console.warn('Capacitor Share failed', e)
  }

  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch {}
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
  revokeLater(url, 180000)
  showInAppPdfViewer(url, name)
  await downloadBlobUrl(url, name)
  return name
}

/** Open/download an existing Blob (statements, etc.) */
export async function openPdfBlob(blob, name = 'document.pdf') {
  const url = URL.createObjectURL(blob)
  revokeLater(url)
  showInAppPdfViewer(url, name)
  return url
}

export async function downloadPdfBlob(blob, name = 'document.pdf') {
  const url = URL.createObjectURL(blob)
  revokeLater(url, 180000)
  showInAppPdfViewer(url, name)
  await downloadBlobUrl(url, name)
  return name
}
