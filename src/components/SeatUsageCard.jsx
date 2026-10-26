import React, { useMemo } from 'react'
import { seatLimits, seatUsage } from '../lib/seats'

export default function SeatUsageCard({ settings, license, teamMembers = [], branches = [], devices = [] }) {
  const limits = useMemo(() => seatLimits(settings, license), [settings, license])
  const usage = useMemo(
    () => seatUsage({ teamMembers, branches, devices }, limits),
    [teamMembers, branches, devices, limits],
  )
  const row = (label, u) => {
    const over = u.used > u.max
    return (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span>{label}</span>
        <strong style={{ color: over ? '#ef4444' : 'inherit' }}>
          {u.used} / {u.max}{over ? ' · over limit' : ''}
        </strong>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <strong>Seats · {limits.tier}</strong>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>Upgrade tier in License when you outgrow limits.</p>
      {row('Users / team', usage.users)}
      {row('Branches', usage.branches)}
      {row('Devices', usage.devices)}
    </div>
  )
}
