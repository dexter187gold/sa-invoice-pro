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
        <p className="muted" style={{ marginTop: 12 }}>If you are the workspace owner and have been locked out by a seat role, use the server-verified recovery screen.</p>
        <a className="btn btn-outline" href="/owner-recovery">Owner account recovery</a>
      </div>
    )
  }
  return children
}
