/** Client NPS / satisfaction (P4) */
const KEY = 'saip_nps_log'

export function loadNpsLog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveNpsScore({ clientId, score, note = '', source = 'desk' }) {
  const s = Math.max(0, Math.min(10, Number(score)))
  const row = {
    id: `nps-${Date.now()}`,
    clientId: clientId || null,
    score: s,
    note: String(note || '').slice(0, 400),
    source,
    at: new Date().toISOString(),
  }
  const list = loadNpsLog()
  list.unshift(row)
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)))
  return row
}

export function npsSummary(log = loadNpsLog()) {
  if (!log.length) return { avg: null, count: 0, promoters: 0, detractors: 0, nps: null }
  const scores = log.map((r) => Number(r.score)).filter((n) => Number.isFinite(n))
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  const nps = Math.round(((promoters - detractors) / scores.length) * 100)
  return { avg: Math.round(avg * 10) / 10, count: scores.length, promoters, detractors, nps }
}
