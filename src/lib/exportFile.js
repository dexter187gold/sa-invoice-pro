/**
 * Safe client-side file download helpers (Blob → anchor click).
 */
export function downloadBlob(blob, filename) {
  if (!blob) throw new Error('Nothing to download')
  const name = String(filename || 'download').replace(/[\\/:*?"<>|]+/g, '_')
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  return { filename: name, size: blob.size || 0 }
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  return downloadBlob(new Blob([text], { type: mime }), filename)
}

export function downloadJson(value, filename) {
  const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return downloadText(body, filename || 'export.json', 'application/json;charset=utf-8')
}
