import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Sync } from '../lib/sync'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { formatMoney } from '../lib/money'
import { analyzeFinancialIntegrity } from '../lib/financialIntegrity'
import { PageFade } from '../components/ui'

function Stat({ label, value, hint, to }) {
  const content = <div className="card" style={{ height: '100%' }}>
    <div className="muted" style={{ fontSize: 12 }}>{label}</div>
    <div style={{ fontSize: 25, fontWeight: 800, marginTop: 4 }}>{value}</div>
    {hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>}
  </div>
  return to ? <Link to={to} style={{ color: 'inherit', textDecoration: 'none' }}>{content}</Link> : content
}

export default function OwnerCommandCentre() {
  const { invoices, quotes, tickets, clients, expenses, payments, company, online, syncNow, toast } = useApp()
  const [access, setAccess] = useState('checking')
  const [team, setTeam] = useState(null)
  const [bankRows, setBankRows] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [integrity, setIntegrity] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([Sync.getTeam(), db.getAll(STORES.bankTxns)]).then(([result, rows]) => {
      if (!live) return
      setTeam(result)
      setAccess(result?.isOwner ? 'owner' : 'denied')
      setBankRows(rows || [])
    }).catch((e) => {
      if (!live) return
      setAccess('unverified')
      setError(e?.message || 'Could not verify workspace owner')
    })
    return () => { live = false }
  }, [])

  const metrics = useMemo(() => {
    const open = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(String(i.status || '').toLowerCase()))
    const overdue = open.filter((i) => i.status === 'overdue')
    const balance = open.reduce((sum, i) => sum + (Number(i.amountDue ?? i.total) || 0), 0)
    const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const paidThisMonth = payments.filter((p) => String(p.date || '').slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const uncategorized = bankRows.filter((b) => !b.category || b.category === 'Unclassified' || b.bookkeepingStatus === 'needs-review')
    const stalePortal = false
    const suggestions = []
    if (overdue.length) suggestions.push({ level: 'warning', title: overdue.length + ' overdue invoice(s)', detail: formatMoney(overdue.reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)) + ' outstanding. Review the ageing report and send reminders.', to: '/reports' })
    if (uncategorized.length) suggestions.push({ level: 'warning', title: uncategorized.length + ' bank line(s) need review', detail: 'Classify and reconcile statement lines before relying on bookkeeping totals.', to: '/bank' })
    if (quotes.some((q) => ['draft', 'sent'].includes(String(q.status || 'draft').toLowerCase()))) suggestions.push({ level: 'info', title: 'Quotes need follow-up', detail: 'Review draft and sent quotes; confirm decisions before converting to invoices.', to: '/quotes' })
    if (!online) suggestions.push({ level: 'warning', title: 'Device is offline', detail: 'Cloud actions may be delayed. Reconnect and run Sync Now before important cross-device work.', to: '/sync' })
    if (!suggestions.length) suggestions.push({ level: 'success', title: 'No obvious priority flags', detail: 'Continue routine reconciliation, backups, and release checks.', to: '/sync' })
    return { open: open.length, overdue: overdue.length, balance, expenseTotal, paidThisMonth, uncategorized: uncategorized.length, suggestions, jobsOpen: tickets.filter(t => !['closed','resolved','cancelled'].includes(String(t.status || '').toLowerCase())).length }
  }, [invoices, quotes, tickets, expenses, payments, bankRows, online])

  async function runIntegrityScan() {
    setScanning(true); setError('')
    try {
      const [allInvoices, allPayments, allBankRows, allJournal] = await Promise.all([
        db.getAll(STORES.invoices), db.getAll(STORES.payments), db.getAll(STORES.bankTxns), db.getAll(STORES.journal),
      ])
      setIntegrity(analyzeFinancialIntegrity({ invoices: allInvoices, payments: allPayments, bankTxns: allBankRows, journal: allJournal }))
    } catch (e) { setError(e?.message || 'Financial integrity scan failed') }
    finally { setScanning(false) }
  }

  async function runSync() {
    setSyncing(true)
    try {
      await syncNow?.()
      toast?.('Sync requested. Check Sync Health for the confirmed result.', 'info')
    } catch (e) {
      toast?.(e?.message || 'Sync failed', 'error')
    } finally { setSyncing(false) }
  }

  if (access === 'checking') return <PageFade><div className="card">Verifying workspace owner with the cloud server…</div></PageFade>
  if (access !== 'owner') return <PageFade><div className="card"><h1>Owner command centre</h1><p>This area requires a verified workspace owner cloud session. Local seat role labels alone do not grant access.</p>{error && <p role="alert" className="error">{error}</p>}<Link className="btn" to="/owner-recovery">Open owner recovery</Link></div></PageFade>

  return <PageFade>
    <div className="page-header"><div><h1>Owner command centre</h1><p className="subtitle">{company?.name || 'Workspace'} · owner-verified overview and next actions</p></div>
      <button className="btn btn-outline" disabled={syncing} onClick={runSync}>{syncing ? 'Syncing…' : 'Request sync'}</button>
    </div>
    <div className="grid grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
      <Stat label="Open invoices" value={metrics.open} hint={formatMoney(metrics.balance) + ' open balance'} to="/invoices" />
      <Stat label="Overdue invoices" value={metrics.overdue} hint="Collection attention" to="/reports" />
      <Stat label="Payments this month" value={formatMoney(metrics.paidThisMonth)} hint="Recorded payments" to="/payments" />
      <Stat label="Expenses recorded" value={formatMoney(metrics.expenseTotal)} hint="Review category accuracy" to="/expenses" />
      <Stat label="Clients" value={clients.length} hint="Customer records" to="/clients" />
      <Stat label="Open jobs" value={metrics.jobsOpen} hint="Work in progress" to="/tickets" />
    </div>
    <section style={{ marginTop: 20 }}>
      <h2>Owner suggestions</h2>
      <p className="muted">These are rule-based prompts from current local records, not an audit or a guarantee of completeness.</p>
      {metrics.suggestions.map((s, i) => <div className="card" key={s.title} style={{ borderLeft: '4px solid ' + (s.level === 'warning' ? '#d97706' : s.level === 'success' ? '#059669' : '#64748b') }}>
        <strong>{s.title}</strong><p>{s.detail}</p><Link to={s.to}>Review →</Link>
      </div>)}
    </section>
    <section style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}><div><h2>Financial integrity scan</h2><p className="muted">Read-only checks for payment/status mismatches, duplicate bank lines and journal source keys. It never edits records.</p></div><button className="btn btn-outline" disabled={scanning} onClick={runIntegrityScan}>{scanning ? 'Scanning…' : 'Run read-only scan'}</button></div>
      {integrity && <div className="card"><strong>Scan complete</strong><p>{integrity.scanned.invoices} invoices · {integrity.scanned.payments} payments · {integrity.scanned.bankTransactions} bank lines · {integrity.scanned.journalEntries} journal entries checked.</p><p><strong>{integrity.counts.high}</strong> high-priority findings · <strong>{integrity.counts.review}</strong> review findings.</p>{integrity.findings.length ? integrity.findings.slice(0, 30).map((finding, index) => <div key={finding.code + '-' + finding.recordId + '-' + index} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}><strong>{finding.title}</strong><div className="muted" style={{ fontSize: 12 }}>{finding.code} · {finding.recordId}</div><p style={{ marginBottom: 0 }}>{finding.detail}</p></div>) : <p>No obvious integrity issues were found by these checks. This is not a formal audit.</p>}</div>}
    </section>
    <section style={{ marginTop: 20 }}>
      <h2>Owner tools</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link className="btn btn-outline" to="/team">Team roles</Link>
        <Link className="btn btn-outline" to="/owner-recovery">Role / PIN recovery</Link>
        <Link className="btn btn-outline" to="/portal-admin">Client portal administration</Link>
        <Link className="btn btn-outline" to="/bank">Bank reconciliation</Link>
        <Link className="btn btn-outline" to="/sync">Sync health</Link>
        <Link className="btn btn-outline" to="/roadmap">Product roadmap</Link>
      </div>
    </section>
  </PageFade>
}
