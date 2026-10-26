export async function getDeviceFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width) + 'x' + String(screen.height),
    String(screen.colorDepth),
    String(navigator.hardwareConcurrency || 0),
    String(navigator.maxTouchPoints || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ]
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 40
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(0, 0, 120, 40)
    ctx.fillStyle = '#069'
    ctx.fillText('saip-fp', 4, 12)
    parts.push(canvas.toDataURL().slice(-64))
  } catch {}
  const raw = parts.join('|')
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)
  }
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0
  return 'fp' + Math.abs(h).toString(16) + raw.length.toString(16)
}

export function deviceMeta() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || navigator.userAgentData?.platform || '',
    label: (navigator.userAgentData?.platform || navigator.platform || 'Device') + ' · ' + (navigator.language || ''),
  }
}
