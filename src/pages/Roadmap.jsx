import React from 'react'

const PHASES = [
  { id: 'P1', title: 'Legal, privacy & consent', code: 'Committed', note: 'Consent preferences and draft terms/privacy notices are present; business identity and legal review remain outstanding.' },
  { id: 'P2', title: 'Quiet sync status and activity LEDs', code: 'Committed', note: 'Header LED reflects sync and assistant activity; routine scheduled-sync toast replaced with quiet status logging.' },
  { id: 'P3', title: 'Help centre and support tickets', code: 'Committed', note: 'Searchable guides, diagnostics, authenticated ticket API, and admin queue code are present; backend rollout and live ticket test remain outstanding.' },
  { id: 'P4', title: 'Cloud AI assistant', code: 'Committed', note: 'Workers AI endpoint and chat integration are committed; deployment, model binding and authenticated live-response test remain outstanding.' },
  { id: 'P5', title: 'Authentication and session security', code: 'In progress', note: 'AI requests validate the existing cloud token; broader session and permission review is still needed.' },
  { id: 'P6', title: 'POPIA data-subject request workflow', code: 'Planned', note: 'Access, correction, objection, deletion and escalation workflow.' },
  { id: 'P7', title: 'Backup and restore verification', code: 'Planned', note: 'Repeatable export, restore checks and recovery guidance.' },
  { id: 'P8', title: 'Invoice and VAT calculation integrity', code: 'Planned', note: 'Boundary tests for totals, rounding, VAT and credit notes.' },
  { id: 'P9', title: 'Payment reconciliation', code: 'Planned', note: 'Partial payments, allocations, duplicate detection and reconciliation.' },
  { id: 'P10', title: 'Client portal end-to-end validation', code: 'Planned', note: 'Authentication, links, expiry, quotes and payment journeys.' },
  { id: 'P11', title: 'Job cards and ticket lifecycle', code: 'Planned', note: 'Status transitions, work logs, attachments and invoice linkage.' },
  { id: 'P12', title: 'Team roles and permissions', code: 'Planned', note: 'Enforce least privilege in UI and server endpoints.' },
  { id: 'P13', title: 'Audit trail and change history', code: 'Planned', note: 'Trace important edits and security-relevant events.' },
  { id: 'P14', title: 'Accessibility and mobile UX', code: 'Planned', note: 'Keyboard, contrast, focus states and small-screen testing.' },
  { id: 'P15', title: 'Performance and offline resilience', code: 'Planned', note: 'Startup, offline queues, retry behavior and duplicate prevention.' },
  { id: 'P16', title: 'Error monitoring and diagnostics', code: 'Planned', note: 'Actionable errors without leaking customer data.' },
  { id: 'P17', title: 'Integration and webhook safety', code: 'Planned', note: 'Signature validation, idempotency and secret handling.' },
  { id: 'P18', title: 'Automated regression tests', code: 'Planned', note: 'Unit, browser, API and failure-path coverage.' },
  { id: 'P19', title: 'Production deployment verification', code: 'Planned', note: 'Verify exact commit, Worker version, backend deploy and smoke checks.' },
  { id: 'P20', title: 'Final acceptance and release notes', code: 'Planned', note: 'Acceptance checklist, known limitations and release sign-off.' },
]

const GATES = [
  { key: 'code', title: 'Implementation', count: 5, detail: 'P1–P4 code committed; P5 partially underway.' },
  { key: 'tests', title: 'Latest tests verified', count: 0, detail: 'Do not count earlier runs as validation of the latest AI integration commit.' },
  { key: 'deploy', title: 'Latest deployment verified', count: 0, detail: 'The AI Worker and support backend need rollout confirmation against the current commits.' },
  { key: 'accept', title: 'Accepted / legally reviewed', count: 0, detail: 'No phase is marked accepted before operational checks and required legal review.' },
]

export default function Roadmap() {
  const started = PHASES.filter((p) => p.code === 'Committed' || p.code === 'In progress').length
  const percent = Math.round(started / PHASES.length * 100)
  return (
    <div className="page-stack roadmap-page">
      <div className="page-heading">
        <div><div className="eyebrow">MEGA UPDATE</div><h1>P1–P20 execution roadmap</h1><p className="muted">Four separate gates prevent committed code being mistaken for a tested, deployed or accepted feature.</p></div>
        <span className="roadmap-counter">{started}/20 started</span>
      </div>
      <section className="card roadmap-progress">
        <div className="roadmap-progress-label"><strong>Implementation started</strong><strong>{percent}%</strong></div>
        <div className="roadmap-track"><span style={{ width: percent + '%' }} /></div>
        <div className="roadmap-gates">
          {GATES.map((g) => <article className="roadmap-gate" key={g.key}><span className="roadmap-gate-count">{g.count}/20</span><strong>{g.title}</strong><p>{g.detail}</p></article>)}
        </div>
        <p className="muted roadmap-note">These are conservative checkpoint counts, not estimated completion percentages. Test, deployment and acceptance counts stay at zero until evidence is available for the current batch.</p>
      </section>
      <div className="roadmap-list">
        {PHASES.map((p) => <article className="roadmap-item roadmap-item-detail" key={p.id}>
          <div className="roadmap-id">{p.id}</div>
          <div className="roadmap-item-copy"><strong>{p.title}</strong><span className="muted">{p.note}</span></div>
          <span className={'roadmap-state ' + p.code.toLowerCase().replace(/\\s+/g, '-')}>{p.code}</span>
        </article>)}
      </div>
      <p className="muted">The privacy notice and terms are drafts, not a legal opinion or proof of POPIA compliance. Verify the responsible legal entity, physical address, Information Officer details, processors, retention schedule and incident-response process before making compliance claims.</p>
    </div>
  )
}
