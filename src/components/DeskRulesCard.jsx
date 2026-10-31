import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { evaluateDeskRules } from '../lib/deskRules'

export default function DeskRulesCard({ invoices, tickets, clients }) {
  const [open, setOpen] = useState(false)
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
      <button type="button" className="desk-rules-fab" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Open Desk Rules updates" title="Desk Rules">
        <span aria-hidden="true">✦</span><small>Desk Rules</small><i>{tips.length}</i>
      </button>
    </div>
  )
}
