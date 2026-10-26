import React from 'react'
import { Link } from 'react-router-dom'
import { buildCollectionRing } from '../lib/collectionRing'
import { openWhatsApp } from '../lib/share'

export default function CollectionRing({ tickets, clients }) {
  const ring = buildCollectionRing(tickets, clients)
  if (!ring.length) {
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <strong>Collection ring</strong>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>No jobs marked ready for collection.</p>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Collection ring</strong>
        <span className="muted" style={{ fontSize: 12 }}>{ring.length} waiting</span>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
        Floor view — who is ready / waiting longest.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ring.map((r) => (
          <div key={r.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10,
            background: r.urgency === 'hot' ? 'rgba(239,68,68,.12)' : r.urgency === 'warm' ? 'rgba(245,158,11,.12)' : 'var(--surface-2, #1a2336)',
          }}>
            <div style={{ minWidth: 0 }}>
              <Link to={`/tickets?open=${encodeURIComponent(r.id)}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                {r.title}
              </Link>
              <div className="muted" style={{ fontSize: 12 }}>
                {r.clientName} · {r.waitHrs}h · {r.status}
              </div>
            </div>
            {r.phone ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                openWhatsApp(r.phone, `Hi ${r.clientName}, your device is ready for collection. — Job: ${r.title}`)
              }}>WA</button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
