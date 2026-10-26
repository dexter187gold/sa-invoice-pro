import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveSeat, activeSeatSummary } from '../lib/seats'

/** Compact active-seat indicator for shell / home. */
export default function ActiveSeatChip({ compact = false }) {
  const [summary, setSummary] = useState(() => activeSeatSummary(null))

  const refresh = async () => {
    try {
      const seat = await getActiveSeat()
      setSummary(activeSeatSummary(seat))
    } catch {
      setSummary(activeSeatSummary(null))
    }
  }

  useEffect(() => {
    refresh()
    const onSeat = () => refresh()
    window.addEventListener('sa-active-seat', onSeat)
    return () => window.removeEventListener('sa-active-seat', onSeat)
  }, [])

  return (
    <Link
      to="/team"
      className="active-seat-chip"
      title="Switch seat under Team"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '2px 8px' : '4px 10px',
        borderRadius: 99,
        fontSize: compact ? 11 : 12,
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--green-soft, rgba(16,185,129,.12))',
        border: '1px solid var(--border, rgba(148,163,184,.2))',
      }}
    >
      <span style={{ opacity: 0.75 }}>Seat</span>
      <strong>{summary.label}</strong>
      {!compact && summary.roleLabel ? (
        <span style={{ opacity: 0.7 }}>· {summary.roleLabel}</span>
      ) : null}
    </Link>
  )
}
