import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { evaluateDeskRules } from '../lib/deskRules'

export default function DeskRulesCard({ invoices, tickets, clients }) {
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const tips = useMemo(
    () => evaluateDeskRules({ invoices, tickets, clients }),
    [invoices, tickets, clients],
  )
  if (!tips.length) return null
  return (
    <div className="desk-rules-float">
      {open ? (
        <section className="desk-rules-popover card" aria-label="Desk Rules updates">
          <div className="desk-rules-popover-head">
            <div><strong>Desk Rules</strong><p className="muted">Smart suggestions — you stay in control.</p></div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)} aria-label="Close Desk Rules">×</button>
          </div>
          <ul>
            {tips.map((t) => (
              <li key={t.id}>
                <span data-severity={t.severity}>{t.title}</span>{' · '}<Link to={t.href} onClick={() => setOpen(false)}>{t.action}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button type="button" className="desk-rules-fab" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} onPointerDown={(e) => { suppressClick.current = false; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false }; e.currentTarget.setPointerCapture?.(e.pointerId) }} onPointerMove={(e) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true; if (d.moved) setOffset({ x: d.ox + dx, y: d.oy + dy }) }} onPointerUp={(e) => { const d = drag.current; if (d?.moved) { suppressClick.current = true; e.preventDefault(); e.stopPropagation() }; drag.current = null }} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return }; setOpen((v) => !v) }} aria-expanded={open} aria-label="Open Desk Rules updates" title="Desk Rules">
        <span aria-hidden="true">✦</span><small>Desk Rules</small><i>{tips.length}</i>
      </button>
    </div>
  )
}
