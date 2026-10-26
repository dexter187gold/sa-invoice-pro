import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { currentCan, permForPath } from '../lib/roleGate'

export default function RoleGate({ children }) {
  const loc = useLocation()
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const perm = permForPath(loc.pathname)
      if (!perm) {
        if (alive) setOk(true)
        return
      }
      const allowed = await currentCan(perm)
      if (alive) setOk(allowed)
    })()
    return () => { alive = false }
  }, [loc.pathname])

  if (ok === null) return <div className="muted" style={{ padding: 24 }}>Checking access…</div>
  if (!ok) {
    return (
      <div className="card" style={{ margin: 24 }}>
        <strong>Access restricted</strong>
        <p className="muted">Your seat role cannot open this page. Switch seat under Team or ask the owner.</p>
        <a className="btn btn-outline" href="/">Home</a>
      </div>
    )
  }
  return children
}
