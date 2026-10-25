export function emptyTimeLog() {
  return { segments: [], runningSince: null }
}

export function ensureTimeLog(ticket) {
  const tl = ticket?.timeLog
  if (tl && Array.isArray(tl.segments)) {
    return { segments: tl.segments, runningSince: tl.runningSince || null }
  }
  return emptyTimeLog()
}

export function startClock(timeLog, meta = {}) {
  const tl = ensureTimeLog({ timeLog })
  if (tl.runningSince) return tl
  return {
    ...tl,
    runningSince: new Date().toISOString(),
    lastMeta: meta,
  }
}

export function stopClock(timeLog, note = '') {
  const tl = ensureTimeLog({ timeLog })
  if (!tl.runningSince) return tl
  const start = new Date(tl.runningSince).getTime()
  const end = Date.now()
  const minutes = Math.max(1, Math.round((end - start) / 60000))
  const seg = {
    id: 'seg_' + Date.now().toString(36),
    startedAt: tl.runningSince,
    endedAt: new Date(end).toISOString(),
    minutes,
    note: String(note || '').trim(),
  }
  return {
    segments: [...(tl.segments || []), seg],
    runningSince: null,
  }
}

export function totalMinutes(timeLog) {
  const tl = ensureTimeLog({ timeLog })
  let m = (tl.segments || []).reduce((s, x) => s + (Number(x.minutes) || 0), 0)
  if (tl.runningSince) {
    m += Math.max(0, Math.round((Date.now() - new Date(tl.runningSince).getTime()) / 60000))
  }
  return m
}

export function formatDuration(mins) {
  const m = Math.max(0, Math.floor(Number(mins) || 0))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h <= 0) return `${r}m`
  return `${h}h ${r}m`
}

export function labourFromMinutes(minutes, hourlyRate) {
  const hrs = (Number(minutes) || 0) / 60
  const rate = Number(hourlyRate) || 0
  return Math.round(hrs * rate * 100) / 100
}
