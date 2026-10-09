import React, { useState } from 'react'
import { useAppAssistant } from '../hooks/useAppAssistant'

function mdLite(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

export default function AppAssistant() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { hints, searchFaq, pathname } = useAppAssistant()
  const results = searchFaq(q)

  return (
    <>
      <button
        type="button"
        className="app-assist-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Help and tips"
        title="Help & tips"
      >
        <span className="app-assist-fab-icon" aria-hidden>✦</span>
      </button>
      {open && (
        <div className="app-assist-panel" role="dialog" aria-label="In-app guide">
          <div className="app-assist-head">
            <div>
              <strong>Help & tips</strong>
              <div className="muted" style={{ fontSize: 12 }}>Route: {pathname}</div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="app-assist-section">
            <div className="app-assist-label">Right now</div>
            <ul className="app-assist-hints">
              {hints.map((h, i) => (
                <li key={i}>{mdLite(h)}</li>
              ))}
            </ul>
          </div>
          <div className="app-assist-section">
            <div className="app-assist-label">Search workflows</div>
            <input
              className="input"
              placeholder="e.g. job card, partial payment, VAT, backup…"
              aria-label="Search help topics"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="app-assist-faq">
              {results.slice(0, 8).map((f) => (
                <details key={f.q} className="app-assist-faq-item">
                  <summary>{f.q}</summary>
                  <p>{mdLite(f.a)}</p>
                </details>
              ))}
              {!results.length && <p className="muted">No matches — try “invoice”, “job card” or “payroll”.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
