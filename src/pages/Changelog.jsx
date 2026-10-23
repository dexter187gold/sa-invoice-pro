import React from 'react'
import { Link } from 'react-router-dom'
import { PageFade } from '../components/ui'
import { APP_VERSION } from '../config'

const ENTRIES = [
  {
    v: '5.6.0',
    title: 'Bank match · Recurring · Ticket bill · Sync health',
    items: [
      'Bank CSV import on Payments — FNB/Standard/ABSA-style parse + score match to open invoices',
      'Apply suggested bank matches as EFT payments in one tap',
      'Recurring invoice templates (+ Retainer) and Generate recurring on Invoices',
      'Ticket → invoice one click (Create invoice on job card + Bill selected)',
      'Sync health panel at /sync — ping, queue, last sync, force push/pull',
      'Undo delete (30s) for invoices + Undo delete button',
      'Batch WA overdue — opens first reminders and copies full list',
    ],
  },
  {
    v: '5.5.0',
    title: 'Top clients · Credit notes · Roadmap 100',
    items: [
      'Top clients by cash-in on Home',
      'Credit note (CN) from any invoice',
      'Shared duplicateInvoice / createCreditNote helpers',
      'Aging bucket key consistency (older)',
      'ROADMAP_100.md — 100 ranked ideas for SA field service',
    ],
  },
  {
    v: '5.4.0',
    title: 'Dup · Aging · Month cash · Excel',
    items: [
      'Duplicate quote one-tap',
      'Month revenue / expense / net on Home',
      'Payment % chips (25/50/75/100)',
      'Command palette → Excel viewer',
      'Roadmap companion document',
    ],
  },
  {
    v: '5.3.3',
    title: 'Cloud recovery · Excel · Payments · Multiline',
    items: [
      'Recovery codes (on-screen, no email required)',
      'Cloud-first reset + auto sign-in',
      'Excel / CSV viewer with filter',
      'Mark all open paid · copy receipt · reuse payment',
      'Multiline descriptions on quotes and invoices',
    ],
  },
]

export default function Changelog() {
  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Changelog</h1>
          <p className="subtitle">What shipped · current {APP_VERSION}</p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-outline" to="/">Home</Link>
          <Link className="btn btn-outline" to="/sync">Sync health</Link>
          <a className="btn btn-outline" href="https://github.com/dexter187gold/sa-invoice-pro" target="_blank" rel="noreferrer">Repo</a>
        </div>
      </div>

      {ENTRIES.map((e) => (
        <div key={e.v} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>v{e.v}</h3>
            <span className="muted" style={{ fontSize: 13 }}>{e.title}</span>
          </div>
          <ul style={{ marginBottom: 0 }}>
            {e.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Roadmap</h3>
        <p className="muted">
          Full ranked list of 100 ideas lives in the repo as <code>ROADMAP_100.md</code>.
          Next focus: bank auto-match polish, PayFast webhooks, quote win-rate, multi-user seats.
        </p>
      </div>
    </PageFade>
  )
}
