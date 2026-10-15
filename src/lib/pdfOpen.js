/**
 * Capacitor / Android WebView-safe PDF open + download + share.
 *
 * This APK shell has NO @capacitor/share or @capacitor/filesystem plugins
 * (capacitor.plugins.json is []). So we rely on pure WebView techniques:
 *   1. In-app overlay viewer (iframe / object)
 *   2. data: URL + <a download> (more reliable than blob: on Android WebView)
 *   3. Web Share API with File when the browser allows it
 *   4. window.print() → Android "Save as PDF" / print sheet
 *   5. Visible toasts so taps never feel "dead"
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

function blobToBase64(blob) {
  return blobToDataUrl(blob).then((s) => {
    const i = s.indexOf(',')
    return i >= 0 ? s.slice(i + 1) : s
  })
}

async function saveViaFilesystem(blob, name) {
  try {
    const Filesystem = window.Capacitor?.Plugins?.Filesystem
    if (!Filesystem?.writeFile) return false
    const data = await blobToBase64(blob)
    for (const directory of ['DOCUMENTS', 'CACHE', 'DATA', 'EXTERNAL', 'EXTERNAL_STORAGE']) {
      try {
        await Filesystem.writeFile({ path: name, data, directory, recursive: true })
        return true
      } catch {}
    }
  } catch (e) {
    console.warn('Filesystem PDF save failed', e)
  }
  return false
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

function printPdfUrl(url) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
    frame.src = url
    document.body.appendChild(frame)
    const done = () => {
      try {
        frame.remove()
      } catch {}
      resolve()
    }
    frame.onload = () => {
      try {
        frame.contentWindow.focus()
        frame.contentWindow.print()
      } catch (e) {
        console.warn('print failed', e)
      }
      setTimeout(done, 800)
    }
    setTimeout(done, 4000)
  })
}

export function showInAppPdfViewer(url, name = 'document.pdf') {
  const existing = document.getElementById('sa-pdf-viewer')
  if (existing) existing.remove()

  const wrap = document.createElement('div')
  wrap.id = 'sa-pdf-viewer'
  wrap.setAttribute('role', 'dialog')
  wrap.setAttribute('aria-label', 'PDF preview')
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;background:rgba(8,6,16,.96);display:flex;flex-direction:column;font-family:system-ui,Segoe UI,sans-serif;'

  const bar = document.createElement('div')
  bar.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0c0a14;color:#f0e6ff;flex-shrink:0;border-bottom:1px solid rgba(232,121,249,.35);flex-wrap:wrap;'

  const title = document.createElement('strong')
  title.style.cssText =
    'flex:1;min-width:100px;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
  title.textContent = name
  bar.appendChild(title)

  const btnStyle =
    'border-radius:8px;padding:10px 14px;font-weight:700;font-size:13px;cursor:pointer;min-height:40px;'

  const mkBtn = (label, colors, onClick) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.style.cssText = btnStyle + colors
    b.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }
    return b
  }

  bar.appendChild(
    mkBtn('Download', 'background:transparent;color:#e879f9;border:1px solid rgba(232,121,249,.55);', () => {
      downloadBlobUrl(url, name)
    })
  )
  bar.appendChild(
    mkBtn('Share', 'background:transparent;color:#38bdf8;border:1px solid rgba(56,189,248,.55);', () => {
      sharePdf(url, name)
    })
  )
  bar.appendChild(
    mkBtn('Print / Save', 'background:transparent;color:#a3e635;border:1px solid rgba(163,230,53,.5);', async () => {
      toast('Opening print sheet — choose “Save as PDF” or a printer…')
      await printPdfUrl(url)
    })
  )
  bar.appendChild(
    mkBtn('Close', 'background:#e879f9;color:#0c0a14;border:0;', () => wrap.remove())
  )

  const frameWrap = document.createElement('div')
  frameWrap.style.cssText = 'flex:1;position:relative;background:#1a1625;min-height:0;'

  const frame = document.createElement('iframe')
  frame.title = 'PDF preview'
  frame.src = url
  frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#1a1625;'

  const obj = document.createElement('object')
  obj.type = 'application/pdf'
  obj.data = url
  obj.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;border:0;background:#1a1625;display:none;'

  frameWrap.appendChild(frame)
  frameWrap.appendChild(obj)

  setTimeout(() => {
    try {
      obj.style.display = 'block'
      frame.style.opacity = '1'
    } catch {}
  }, 600)

  const note = document.createElement('div')
  note.style.cssText =
    'padding:10px 14px;background:#161222;color:rgba(240,230,255,.85);font-size:12px;flex-shrink:0;line-height:1.4;'
  note.innerHTML = isNative()
    ? '<b>Android tip:</b> Preview may be blank in WebView. Tap <b>Download</b>, <b>Share</b>, or <b>Print / Save</b> → “Save as PDF”. The file is ready.'
    : 'If the preview is blank, use <b>Download</b> or <b>Print / Save</b> — the PDF is ready.'

  wrap.appendChild(bar)
  wrap.appendChild(frameWrap)
  wrap.appendChild(note)
  document.body.appendChild(wrap)
  return wrap
}

export async function blobFromUrl(url) {
  const res = await fetch(url)
  return res.blob()
}

export async function downloadBlobUrl(url, name = 'document.pdf') {
  toast('Preparing download…', 1500)
  let blob
  try {
    blob = await blobFromUrl(url)
  } catch (e) {
    console.warn('blobFromUrl failed', e)
    toast('Could not read PDF for download')
    return
  }

  if (isNative()) {
    const saved = await saveViaFilesystem(blob, name)
    if (saved) {
      toast('Saved to device storage')
      try {
        await sharePdf(url, name)
      } catch {}
      return
    }
  }

  try {
    const dataUrl = await blobToDataUrl(blob)
    triggerAnchorDownload(dataUrl, name)
    toast('Download started — check Notifications / Downloads')
  } catch (e) {
    console.warn('dataUrl download failed', e)
    try {
      triggerAnchorDownload(url, name)
      toast('Download triggered')
    } catch (e2) {
      console.warn(e2)
    }
  }

  try {
    const Share = window.Capacitor?.Plugins?.Share
    if (Share?.share) {
      const dataUrl = await blobToDataUrl(blob)
      await Share.share({ title: name, text: name, url: dataUrl, dialogTitle: 'Save or share PDF' })
      return
    }
  } catch {}

  try {
    const file = new File([blob], name, { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name })
      toast('Shared')
      return
    }
  } catch (e) {
    if (e?.name === 'AbortError') return
  }
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
      toast('Share sheet opened — file also sent to Downloads')
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
  toast('Share not available — file downloaded. Or use Print / Save.')
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
  revokeLater(url, 300000)
  showInAppPdfViewer(url, name)
  await downloadBlobUrl(url, name)
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
  revokeLater(url, 300000)
  showInAppPdfViewer(url, name)
  await downloadBlobUrl(url, name)
  return name
}
