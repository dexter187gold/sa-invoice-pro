import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { evaluateDeskRules } from '../lib/deskRules'

export default function DeskRulesCard({ invoices, tickets, clients }) {
  const tips = useMemo(
    () => evaluateDeskRules({ invoices, tickets, clients }),
    [invoices, tickets, clients],
  )
  if (!tips.length) return null
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <strong>Desk rules</strong>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>Smart suggestions — you stay in control.</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {tips.map((t) => (
          <li key={t.id} style={{ marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: t.severity === 'warn' ? '#f59e0b' : 'inherit' }}>{t.title}</span>
            {' · '}
            <Link to={t.href}>{t.action}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
