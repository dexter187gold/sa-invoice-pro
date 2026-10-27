import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'
import Sync from '../lib/sync'

const ARTICLES = [
  { title: 'Create and send an invoice', category: 'Invoices', body: 'Open Invoices → New invoice, choose a client, add items and quantities, confirm VAT and totals, then save. Preview or export the PDF and verify company, client, bank and tax details before sending.' },
  { title: 'Record a payment', category: 'Payments', body: 'Open Payments and record the actual payment method, date, amount and invoice reference. Reconcile the amount against your bank statement; a payment entry is not proof that money cleared.' },
  { title: 'Sync to another device', category: 'Sync', body: 'Sign in with the same cloud account on both devices, confirm Solo/offline mode is disabled, connect to the internet and run Sync. Wait for the status indicator to settle. Keep a separate exported backup before changing devices.' },
  { title: 'Protect or restore my data', category: 'Backups', body: 'Open Settings → Backup and download an export before major changes. Store it securely; it may contain personal and financial information. Test restores with a safe copy, not over your only working dataset.' },
  { title: 'Set up VAT and company details', category: 'Tax', body: 'Review Settings → Company and VAT. Check the registered business name, address, VAT number, bank details, VAT rate and invoice numbering. Verify statutory treatment with your accountant; the app is not tax advice.' },
  { title: 'Troubleshoot a failed sync', category: 'Sync', body: 'Check internet access, sign-in state, Solo mode and the sync indicator. Avoid repeatedly creating duplicate records while a request is pending. Export a backup and capture the approximate time and exact error before escalating.' },
  { title: 'Use the AI assistant', category: 'Assistant', body: 'Open the star icon in the header. The built-in assistant can answer common workflow questions and summarise the data available in your current app session. Treat responses as guidance and verify financial or legal conclusions. Do not paste passwords, recovery codes or unnecessary sensitive information.' },
  { title: 'Privacy and POPIA', category: 'Privacy', body: 'Use only personal information needed for a legitimate business purpose. Restrict staff access, secure exports, correct inaccurate records and respond to data-subject requests. Review the Privacy & POPIA notice and confirm the responsible party’s contact details.' },
]

export default function Support() {
  const { company, user, online, invoices, clients, tickets } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [issue, setIssue] = useState('')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ticketMessage, setTicketMessage] = useState('')
  const [submittedTicket, setSubmittedTicket] = useState(null)
  const [myTickets, setMyTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [adminTickets, setAdminTickets] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminStatuses, setAdminStatuses] = useState({})
  const [adminReplies, setAdminReplies] = useState({})
  const [adminMessage, setAdminMessage] = useState('')
  const isAdmin = user?.role === 'admin'
  const categories = ['All', ...new Set(ARTICLES.map((a) => a.category))]
  const articles = useMemo(() => ARTICLES.filter((a) => (category === 'All' || a.category === category) && (a.title + ' ' + a.body + ' ' + a.category).toLowerCase().includes(query.toLowerCase())), [category, query])
  const report = useMemo(() => [
    'SA INVOICE PRO — SUPPORT REPORT',
    `Created: ${new Date().toISOString()}`,
    `Workspace: ${company?.name || 'Not set'}`,
    `Account: ${user?.email || user?.username || 'Signed-in user'}`,
    `App online: ${online ? 'Yes' : 'No'}`,
    `App version: ${APP_VERSION}`,
    `Local counts: clients=${clients?.length || 0}, invoices=${invoices?.length || 0}, jobs=${tickets?.length || 0}`,
    `Issue: ${issue || 'Not specified'}`,
    '',
    details,
    '',
    'Privacy: Review this report before sharing. It contains workspace/account metadata and may contain sensitive text entered above.'
  ].join('\\n'), [company, user, online, clients, invoices, tickets, issue, details])
  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sa-invoice-pro-support-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(report); setCopied(true) } catch { downloadReport() }
  }
  const submitTicket = async (e) => {
    e.preventDefault()
    setTicketMessage('')
    setSubmittedTicket(null)
    if (!online) { setTicketMessage('You are offline. Reconnect to submit a ticket, or download the diagnostic report below.'); return }
    setSubmitting(true)
    try {
      const result = await Sync.createSupportTicket({ subject, category: issue || 'Other', details })
      setSubmittedTicket(result.ticket)
      setTicketMessage('Support request submitted successfully.')
      setSubject('')
      setDetails('')
      setMyTickets((prev) => [result.ticket, ...prev.filter((t) => t.id !== result.ticket.id)])
    } catch (e2) {
      setTicketMessage((e2?.message || 'Could not submit the support request.') + ' You can still download a diagnostic report below.')
    } finally { setSubmitting(false) }
  }
  const loadMyTickets = async () => {
    setLoadingTickets(true)
    setTicketMessage('')
    try { const result = await Sync.listSupportTickets(); setMyTickets(result.tickets || []) }
    catch (e) { setTicketMessage(e?.message || 'Could not load your tickets. Sign in to your cloud account and try again.') }
    finally { setLoadingTickets(false) }
  }
  const loadAdminTickets = async () => {
    setAdminLoading(true)
    setAdminMessage('')
    try { const result = await Sync.listAdminSupportTickets(); setAdminTickets(result.tickets || []) }
    catch (e) { setAdminMessage(e?.message || 'Could not load the support queue.') }
    finally { setAdminLoading(false) }
  }
  const updateTicket = async (ticket) => {
    setAdminMessage('')
    try {
      const result = await Sync.updateSupportTicket(ticket.id, { status: adminStatuses[ticket.id] || ticket.status, reply: adminReplies[ticket.id] || '' })
      setAdminTickets((prev) => prev.map((t) => t.id === ticket.id ? result.ticket : t))
      setAdminReplies((prev) => ({ ...prev, [ticket.id]: '' }))
      setAdminMessage(`Updated ${ticket.number}.`)
    } catch (e) { setAdminMessage(e?.message || 'Ticket update failed.') }
  }

  return (
    <div className="page-stack support-page">
      <div className="page-heading"><div><div className="eyebrow">HELP CENTRE</div><h1>Help & Support</h1><p className="muted">Guides, cloud support requests, and diagnostics.</p></div><div className="support-status"><span className={online ? 'support-status-dot online' : 'support-status-dot'} />{online ? 'Device online' : 'Offline mode'}</div></div>
      <div className="support-hero"><div><h2>What can we help you with?</h2><p>Search workflow guides or open the built-in assistant for contextual help.</p><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices, sync, VAT, backups…" aria-label="Search help articles" /></div><div className="support-hero-actions"><button className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('saip-toggle-help'))}>✦ Open AI assistant</button><Link className="btn btn-outline" to="/sync">View sync health</Link><Link className="btn btn-outline" to="/settings">Open settings</Link></div></div>
      <div className="support-filter">{categories.map((c) => <button type="button" key={c} className={category === c ? 'chip chip-active' : 'chip'} onClick={() => setCategory(c)}>{c}</button>)}</div>
      <div className="support-articles">{articles.map((a) => <details className="support-article" key={a.title}><summary><span className="support-category">{a.category}</span><strong>{a.title}</strong><span className="support-chevron">＋</span></summary><p>{a.body}</p></details>)}{articles.length === 0 ? <p className="muted">No matching guides. Try another search term.</p> : null}</div>
      <section className="support-report card"><div><div className="eyebrow">SUPPORT REQUEST</div><h2>Contact support</h2><p className="muted">Submit a request using your signed-in cloud account. Do not include passwords, recovery codes or unnecessary client financial information.</p></div>
        <form className="support-ticket-form" onSubmit={submitTicket}>
          <label>Subject<input className="input" required minLength={4} maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short description of the problem" /></label>
          <label>Issue type<select className="input" value={issue} onChange={(e) => setIssue(e.target.value)}><option value="">Choose an issue</option><option>Sync or data mismatch</option><option>Invoice or PDF issue</option><option>Sign-in or account issue</option><option>Payments or calculations</option><option>Bug or unexpected behaviour</option><option>Privacy or data request</option><option>Other</option></select></label>
          <label>What happened?<textarea className="input" rows={4} required minLength={10} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Steps to reproduce, exact error and approximate time. Avoid sensitive client data." /></label>
          <div className="support-report-actions"><button className="btn btn-primary" type="submit" disabled={submitting || !online}>{submitting ? 'Submitting…' : 'Submit support ticket'}</button><button className="btn btn-outline" type="button" onClick={loadMyTickets} disabled={loadingTickets}>{loadingTickets ? 'Loading…' : 'Load my tickets'}</button></div>
          {ticketMessage ? <p className="support-feedback" role="status">{ticketMessage}</p> : null}
          {submittedTicket ? <div className="support-ticket-success"><strong>Ticket {submittedTicket.number}</strong><span>Status: {submittedTicket.status}</span><span>Keep this reference for follow-up.</span></div> : null}
        </form>
        {myTickets.length ? <div className="support-my-tickets"><h3>Your support requests</h3>{myTickets.map((t) => <article className="support-ticket-row" key={t.id}><div><strong>{t.number || t.subject}</strong><p>{t.subject}</p></div><span className={'roadmap-state ' + String(t.status).toLowerCase()}>{String(t.status).replace('_', ' ')}</span></article>)}</div> : null}
      </section>
      {isAdmin ? <section className="support-report card"><div><div className="eyebrow">STAFF ONLY</div><h2>Support queue</h2><p className="muted">Admin-only ticket queue and status/reply tools.</p></div><div className="support-report-actions"><button className="btn btn-primary" onClick={loadAdminTickets} disabled={adminLoading}>{adminLoading ? 'Loading…' : 'Refresh queue'}</button></div>{adminMessage ? <p role="status">{adminMessage}</p> : null}{adminTickets.map((t) => <article className="support-admin-ticket" key={t.id}><div className="support-admin-ticket-head"><div><strong>{t.number} · {t.subject}</strong><p className="muted">{t.userEmail} · {t.category} · {new Date(t.createdAt).toLocaleString()}</p></div><select className="input" value={adminStatuses[t.id] || t.status} onChange={(e) => setAdminStatuses((prev) => ({ ...prev, [t.id]: e.target.value }))}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div><p>{t.details}</p>{(t.replies || []).map((reply) => <blockquote key={reply.id}><strong>{reply.author}</strong> · {new Date(reply.createdAt).toLocaleString()}<p>{reply.body}</p></blockquote>)}<textarea className="input" rows={2} value={adminReplies[t.id] || ''} onChange={(e) => setAdminReplies((prev) => ({ ...prev, [t.id]: e.target.value }))} placeholder="Reply to the requester (optional)" /><button className="btn btn-outline btn-sm" onClick={() => updateTicket(t)}>Save status / reply</button></article>)}</section> : null}
      <section className="support-report card"><div><div className="eyebrow">DIAGNOSTICS</div><h2>Prepare a diagnostic report</h2><p className="muted">Use this if cloud support is unavailable. The report is downloaded locally and is not sent automatically.</p></div><label>Issue context<select className="input" value={issue} onChange={(e) => setIssue(e.target.value)}><option value="">Choose an issue</option><option>Sync or data mismatch</option><option>Invoice or PDF issue</option><option>Sign-in or account issue</option><option>Payments or calculations</option><option>Bug or unexpected behaviour</option><option>Privacy or data request</option><option>Other</option></select></label><label>Diagnostic notes<textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Notes included in the report. Review before sharing." /></label><div className="support-report-actions"><button className="btn btn-primary" type="button" onClick={downloadReport}>Download report</button><button className="btn btn-outline" type="button" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button><button className="btn btn-outline" type="button" onClick={() => { setIssue(''); setDetails(''); setCopied(false) }}>Clear</button></div></section>
      <p className="muted support-legal-links"><button className="legal-inline-link" onClick={() => window.dispatchEvent(new CustomEvent('saip-open-legal', { detail: 'privacy' }))}>Privacy & POPIA notice</button> · <button className="legal-inline-link" onClick={() => window.dispatchEvent(new CustomEvent('saip-open-legal', { detail: 'terms' }))}>Terms and Conditions</button> · <Link to="/roadmap">Product update roadmap</Link></p>
    </div>
  )
}
