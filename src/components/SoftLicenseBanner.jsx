import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSoftLicenseState } from '../lib/deviceLicense'

export default function SoftLicenseBanner() {
  const [state, setState] = useState(null)

  useEffect(() => {
    let alive = true
    getSoftLicenseState()
      .then((s) => {
        if (alive) setState(s)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!state?.showBanner) return null

  return (
    <div
      className="card"
      style={{
        margin: '0 0 12px',
        padding: '10px 14px',
        borderLeft: state.level === 'trial_ended_soft' ? '4px solid #f59e0b' : '4px solid #38bdf8',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontSize: 13 }}>
        <strong>Alpha license</strong>
        <span className="muted" style={{ marginLeft: 8 }}>
          {state.message}
        </span>
      </div>
      <Link className="btn btn-outline btn-sm" to="/license">
        License
      </Link>
    </div>
  )
}
