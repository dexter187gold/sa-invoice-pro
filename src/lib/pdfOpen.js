/**
 * Capacitor / Android WebView-safe PDF open + download + share.
 */
function isNative() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'android')
  } catch {
    return false
  }
}

export function revokeLater(url, ms = 300000) {
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {}
  }, ms)
}

function toast(msg, ms = 3200) {
  try {
    const id = 'sa-pdf-toast'
    const old = document.getElementById(id)
    if (old) old.remove()
    const el = document.createElement('div')
    el.id = id
    el.textContent = msg
    el.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;' +
      'max-width:90vw;padding:12px 18px;border-radius:12px;background:#1a1228;color:#f0e6ff;' +
      'border:1px solid rgba(232,121,249,.45);font:600 13px system-ui,sans-serif;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.45);text-align:center;'
    document.body.appendChild(el)
    setTimeout(() => {
      try {
        el.remove()
      } catch {}
    }, ms)
  } catch {}
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function triggerAnchorDownload(href, name) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    try {
      a.remove()
    } catch {}
  }, 1500)
}

export async function blobFromUrl(url) {
  const res = await fetch(url)
  return res.blob()
}

export function showInAppPdfViewer(url, name = 'document.pdf') {
  const existing = document.getElementById('sa-pdf-viewer')
  if (existing) existing.remove()
  const wrap = document.createElement('div')
  wrap.id = 'sa-pdf-viewer'
  wrap.setAttribute('role', 'dialog')
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;background:rgba(8,6,16,.96);display:flex;flex-direction:column;font-family:system-ui,sans-serif;'
  const bar = document.createElement('div')
  bar.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0c0a14;color:#f0e6ff;flex-shrink:0;border-bottom:1px solid rgba(232,121,249,.35);flex-wrap:wrap;'
  const title = document.createElement('strong')
  title.style.cssText =
    'flex:1;min-width:100px;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
  title.textContent = name
  bar.appendChild(title)
  const mkBtn = (label, colors, onClick) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.style.cssText =
      'border-radius:8px;padding:10px 14px;font-weight:700;font-size:13px;cursor:pointer;min-height:40px;' +
      colors
    b.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
    return b
  }
  bar.appendChild(
    mkBtn('Download', 'background:transparent;color:#e879f9;border:1px solid rgba(232,121,249,.55);', async () => {
      try {
        const dataUrl = await blobToDataUrl(await blobFromUrl(url))
        triggerAnchorDownload(dataUrl, name)
        toast('Download started')
      } catch {
        triggerAnchorDownload(url, name)
      }
    })
  )
  bar.appendChild(
    mkBtn('Share', 'background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,.55);', () => {
      sharePdf(url, name)
    })
  )
  bar.appendChild(mkBtn('Close', 'background:#e879f9;color:#0c0a14;border:0;', () => wrap.remove()))
  const frameWrap = document.createElement('div')
  frameWrap.style.cssText = 'flex:1;position:relative;background:#1a1625;min-height:0;'
  const frame = document.createElement('iframe')
  frame.title = 'PDF preview'
  frame.src = url
  frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;'
  frameWrap.appendChild(frame)
  const note = document.createElement('div')
  note.style.cssText =
    'padding:10px 14px;background:#161222;color:rgba(240,230,255,.85);font-size:12px;'
  note.textContent = isNative()
    ? 'Android tip: if preview is blank, tap Download or Share.'
    : 'If preview is blank, use Download or Share.'
  wrap.appendChild(bar)
  wrap.appendChild(frameWrap)
  wrap.appendChild(note)
  document.body.appendChild(wrap)
  return wrap
}

export async function sharePdf(url, name = 'document.pdf') {
  toast('Opening share…', 1200)
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
        await navigator.share({ files: [file], title: name, text: name })
        toast('Shared')
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') {
        toast('Share cancelled')
        return
      }
      console.warn('file share failed', e)
    }
  }

  try {
    const Share = window.Capacitor?.Plugins?.Share
    if (Share?.share && blob) {
      const dataUrl = await blobToDataUrl(blob)
      await Share.share({
        title: name,
        text: name,
        url: String(dataUrl),
        dialogTitle: 'Share PDF',
      })
      toast('Shared')
      return
    }
  } catch (e) {
    console.warn('Capacitor Share failed', e)
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: name, text: 'PDF: ' + name })
      if (blob) {
        const dataUrl = await blobToDataUrl(blob)
        triggerAnchorDownload(dataUrl, name)
      }
      toast('Share sheet opened')
      return
    } catch (e) {
      if (e?.name === 'AbortError') {
        toast('Share cancelled')
        return
      }
    }
  }

  if (blob) {
    try {
      const dataUrl = await blobToDataUrl(blob)
      triggerAnchorDownload(dataUrl, name)
    } catch {
      triggerAnchorDownload(url, name)
    }
  }
  toast('Share not available — file downloaded')
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
  revokeLater(url)
  try {
    const dataUrl = await blobToDataUrl(blob)
    triggerAnchorDownload(dataUrl, name)
    toast('Download started — check Downloads')
  } catch {
    triggerAnchorDownload(url, name)
  }
  return name
}

export async function openPdfBlob(blob, name = 'document.pdf') {
  const url = URL.createObjectURL(blob)
  revokeLater(url)
  showInAppPdfViewer(url, name)
  return url
}

export async function downloadPdfBlob(blob, name = 'document.pdf') {
  const url = URL.createObjectURL(blob)
  revokeLater(url)
  try {
    const dataUrl = await blobToDataUrl(blob)
    triggerAnchorDownload(dataUrl, name)
  } catch {
    triggerAnchorDownload(url, name)
  }
  return name
}
