/** Who is waiting for collection (P10.2 floor ops). */
export function buildCollectionRing(tickets = [], clients = []) {
  const ready = ['ready', 'ready_for_collection', 'awaiting_collection', 'resolved']
  const now = Date.now()
  return (tickets || [])
    .filter((t) => {
      const st = String(t.status || '').toLowerCase()
      return ready.some((r) => st.includes(r)) || st === 'resolved'
    })
    .map((t) => {
      const client = (clients || []).find((c) => String(c.id) === String(t.clientId))
      const waitHrs = t.updatedAt ? (now - new Date(t.updatedAt).getTime()) / 3600000 : 0
      return {
        id: t.id,
        title: t.title || t.number || 'Job',
        clientName: client?.name || t.contactName || 'Client',
        phone: t.contactPhone || client?.phone || '',
        status: t.status,
        waitHrs: Math.round(waitHrs * 10) / 10,
        urgency: waitHrs > 48 ? 'hot' : waitHrs > 24 ? 'warm' : 'ok',
      }
    })
    .sort((a, b) => b.waitHrs - a.waitHrs)
    .slice(0, 12)
}
