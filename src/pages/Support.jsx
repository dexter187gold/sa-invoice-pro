import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../config'

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
  const [details, setDetails] = useState('')
  const [copied, setCopied] = useState(false)
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
  ].join('\n'), [company, user, online, clients, invoices, tickets, issue, details])
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
  return (
    <div className="page-stack support-page">
      <div className="page-heading"><div><div className="eyebrow">HELP CENTRE</div><h1>Help & Support</h1><p className="muted">Practical guides, troubleshooting and a safe diagnostic report.</p></div><div className="support-status"><span className={online ? 'support-status-dot online' : 'support-status-dot'} />{online ? 'Device online' : 'Offline mode'}</div></div>
      <div className="support-hero"><div><h2>What can we help you with?</h2><p>Search the guides or prepare a support report with the app version, connectivity and local record counts.</p><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices, sync, VAT, backups…" aria-label="Search help articles" /></div><div className="support-hero-actions"><button className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('saip-toggle-help'))}>✦ Open AI assistant</button><Link className="btn btn-outline" to="/sync">View sync health</Link><Link className="btn btn-outline" to="/settings">Open settings</Link></div></div>
      <div className="support-filter">{categories.map((c) => <button type="button" key={c} className={category === c ? 'chip chip-active' : 'chip'} onClick={() => setCategory(c)}>{c}</button>)}</div>
      <div className="support-articles">{articles.map((a) => <details className="support-article" key={a.title}><summary><span className="support-category">{a.category}</span><strong>{a.title}</strong><span className="support-chevron">＋</span></summary><p>{a.body}</p></details>)}{articles.length === 0 ? <p className="muted">No matching guides. Try another search term.</p> : null}</div>
      <section className="support-report card"><div><div className="eyebrow">DIAGNOSTICS</div><h2>Prepare a support report</h2><p className="muted">This creates a report on your device. It does not automatically send anything to a support team.</p></div><label>Issue type<select className="input" value={issue} onChange={(e) => setIssue(e.target.value)}><option value="">Choose an issue</option><option>Sync or data mismatch</option><option>Invoice or PDF issue</option><option>Sign-in or account issue</option><option>Payments or calculations</option><option>Bug or unexpected behaviour</option><option>Privacy or data request</option><option>Other</option></select></label><label>What happened?<textarea className="input" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Steps to reproduce, exact error and approximate time. Do not include passwords, recovery codes or unnecessary client data." /></label><div className="support-report-actions"><button className="btn btn-primary" type="button" onClick={downloadReport}>Download report</button><button className="btn btn-outline" type="button" onClick={copyReport}>{copied ? 'Copied' : 'Copy report'}</button><button className="btn btn-outline" type="button" onClick={() => { setIssue(''); setDetails(''); setCopied(false) }}>Clear</button></div></section>
      <p className="muted support-legal-links"><button className="legal-inline-link" onClick={() => window.dispatchEvent(new CustomEvent('saip-open-legal', { detail: 'privacy' }))}>Privacy & POPIA notice</button> · <button className="legal-inline-link" onClick={() => window.dispatchEvent(new CustomEvent('saip-open-legal', { detail: 'terms' }))}>Terms and Conditions</button> · <Link to="/roadmap">Product update roadmap</Link></p>
    </div>
  )
}
