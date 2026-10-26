import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBranches, getActiveBranchId } from '../lib/branches'

export default function BranchBanner() {
  const [label, setLabel] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const id = await getActiveBranchId()
        if (!id) {
          if (!cancelled) setLabel('')
          return
        }
        const all = await listBranches()
        const b = (all || []).find((x) => String(x.id) === String(id))
        if (!cancelled) setLabel(b?.name || 'Branch')
      } catch {
        if (!cancelled) setLabel('')
      }
    })()
    return () => { cancelled = true }
  }, [])
  if (!label) return null
  return (
    <div
      style={{
        padding: '6px 12px',
        fontSize: 12,
        background: 'rgba(56,189,248,.12)',
        color: '#38bdf8',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <span>Active branch: <strong>{label}</strong></span>
      <Link to="/branches" style={{ color: 'inherit', fontWeight: 600 }}>Switch</Link>
    </div>
  )
}
