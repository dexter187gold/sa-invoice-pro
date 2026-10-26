import React, { useMemo } from 'react'
import { slaStatusForTicket } from '../lib/sla'

const STYLES = {
  ok: { bg: 'rgba(16,185,129,.15)', color: '#10b981', label: 'SLA OK' },
  risk: { bg: 'rgba(245,158,11,.15)', color: '#f59e0b', label: 'SLA risk' },
  breached: { bg: 'rgba(239,68,68,.15)', color: '#ef4444', label: 'SLA breached' },
  unknown: { bg: 'transparent', color: '#94a3b8', label: 'SLA —' },
}

export default function SlaBadge({ ticket }) {
  const s = useMemo(() => slaStatusForTicket(ticket), [ticket])
  const st = STYLES[s.state] || STYLES.unknown
  const tip = s.hoursLeft != null
    ? `${s.hoursLeft > 0 ? s.hoursLeft + 'h left' : Math.abs(s.hoursLeft) + 'h over'} · cap ${s.capHours}h`
    : ''
  return (
    <span
      title={tip}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: st.bg,
        color: st.color,
      }}
    >
      {st.label}
      {s.hoursLeft != null ? ` ${s.hoursLeft > 0 ? s.hoursLeft + 'h' : 'over'}` : ''}
    </span>
  )
}
