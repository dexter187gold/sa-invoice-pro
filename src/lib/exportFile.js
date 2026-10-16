/**
 * SA Invoice Pro — Unified export / download / share pipeline v5.1
 * Saves files to device Downloads on Android (Capacitor Filesystem)
 * and triggers browser download on web. Share uses file URI when available.
 */

function isNative() {
  try {
    return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'android')
  } catch {
    return false
  }
}

function toast(msg, ms = 3000) {
  try {
    const id = 'sa-export-toast'
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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      resolve(b64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Save blob to Downloads (native) or trigger browser download (web). Returns file URI when native. */
export async function saveToDownloads(blob, filename, mimeType = 'application/pdf') {
  const name = filename || `SAIP-${Date.now()}.pdf`
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const b64 = await blobToBase64(blob)
      const result = await Filesystem.writeFile({
        path: name,
        data: b64,
        directory: Directory.ExternalStorage || Directory.Documents,
        recursive: true,
      }).catch(async () => {
        // Fallback: Documents then Cache
        try {
          return await Filesystem.writeFile({
            path: `Download/${name}`,
            data: b64,
            directory: Directory.Documents,
            recursive: true,
          })
        } catch {
          return await Filesystem.writeFile({
            path: name,
            data: b64,
            directory: Directory.Cache,
            recursive: true,
          })
        }
      })
      const uri = result?.uri || result?.path || ''
      toast(`Saved to Downloads: ${name}`)
      return { ok: true, uri, filename: name }
    } catch (e) {
      console.warn('saveToDownloads native', e)
      toast('Save failed — try Share instead')
      return { ok: false, error: String(e?.message || e) }
    }
  }
  // Web: <a download>
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    toast(`Download started: ${name}`)
    return { ok: true, uri: url, filename: name }
  } catch (e) {
    toast('Download blocked by browser')
    return { ok: false, error: String(e?.message || e) }
  }
}

/** Share via Web Share API or Capacitor Share when available */
export async function shareFile(blob, filename, title = 'SA Invoice Pro') {
  const name = filename || `SAIP-${Date.now()}.pdf`
  const mime = blob.type || 'application/pdf'
  // Prefer native Share with file URI
  if (isNative()) {
    try {
      const saved = await saveToDownloads(blob, name, mime)
      if (saved.ok && saved.uri) {
        const { Share } = await import('@capacitor/share')
        await Share.share({
          title,
          text: name,
          url: saved.uri,
          dialogTitle: 'Share document',
        })
        return { ok: true, via: 'capacitor-share' }
      }
    } catch (e) {
      console.warn('shareFile native', e)
    }
  }
  // Web Share Level 2 with File
  try {
    if (navigator.canShare && navigator.share) {
      const file = new File([blob], name, { type: mime })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: name })
        return { ok: true, via: 'web-share-files' }
      }
      await navigator.share({ title, text: name })
      return { ok: true, via: 'web-share-text' }
    }
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: true, via: 'aborted' }
  }
  // Fallback: save
  return saveToDownloads(blob, name, mime)
}

/** CSV export used by Reports / Accounting buttons */
export async function exportCsvFile(rows, filename = 'export.csv') {
  const csv =
    typeof rows === 'string'
      ? rows
      : Array.isArray(rows)
        ? rows.map((r) => (Array.isArray(r) ? r.map(escapeCsv).join(',') : String(r))).join('\n')
        : String(rows || '')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  return saveToDownloads(blob, filename, 'text/csv')
}

function escapeCsv(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export { toast as exportToast }
