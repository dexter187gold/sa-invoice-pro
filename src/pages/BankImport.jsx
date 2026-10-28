import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState, StatusBadge, formatDateZA } from '../components/ui'
import { formatMoney } from '../lib/money'
import {
  parseBankCsv, normalizeBankRows, matchBankToInvoices, applyBankMatch,
} from '../lib/bankImport'
import { fireWebhook } from '../lib/webhooks'
import { audit } from '../lib/auditLog'

function confidenceMeta(score) {
  const s = Math.min(100, Math.round(score || 0))
  if (s >= 70) return { label: 'High', color: '#10b981', bg: 'rgba(16,185,129,.15)' }
  if (s >= 40) return { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,.15)' }
  if (s > 0) return { label: 'Low', color: '#94a3b8', bg: 'rgba(148,163,184,.12)' }
  return { label: 'None', color: '#64748b', bg: 'transparent' }
}

export default function BankImport() {
  const { invoices, clients, payments, refresh, toast } = useApp()
  const [raw, setRaw] = useState('')
  const [txns, setTxns] = useState([])
  const [matches, setMatches] = useState([])
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(0)
  const [filter, setFilter] = useState('all')
  const [manualPick, setManualPick] = useState({})
  const [skipped, setSkipped] = useState({})
  const [statementName, setStatementName] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [accountLabel, setAccountLabel] = useState('Company bank account')

  const openInvoices = useMemo(
    () => invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')),
    [invoices],
  )

  const stats = useMemo(() => {
    const rows = matches.length ? matches : []
    const withInv = rows.filter((m) => m.invoice)
    const high = rows.filter((m) => m.invoice && (m.score || 0) >= 70)
    const med = rows.filter((m) => m.invoice && (m.score || 0) >= 40 && (m.score || 0) < 70)
    const credits = txns.filter((t) => t.isCredit).length
    return {
      credits,
      matched: withInv.length,
      high: high.length,
      medium: med.length,
      unmatched: Math.max(0, credits - withInv.length),
    }
  }, [matches, txns])

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setStatementName(f.name)
    try {
      if (/\.(xlsx|xls)$/i.test(f.name)) {
        const workbook = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true })
        const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
        const text = matrix.map((row) => row.map((cell) => {
          const value = String(cell ?? '')
          return '"' + value.replace(/"/g, '""') + '"'
        }).join(',')).join('\n')
        setRaw(text)
        parseText(text)
      } else {
        const text = await f.text()
        setRaw(text)
        parseText(text)
      }
    } catch (err) {
      toast(err.message || 'Could not read this statement file', 'error')
    }
  }

  const parseText = (text) => {
    try {
      const { headers, rows } = parseBankCsv(text)
      const normalized = normalizeBankRows({ headers, rows })
      setTxns(normalized)
      const m = matchBankToInvoices(normalized, openInvoices, clients)
      setMatches(m)
      setSkipped({})
      setManualPick({})
      toast(`${normalized.length} transactions · ${m.filter((x) => x.invoice).length} suggested matches`, 'success')
    } catch (err) {
      toast(err.message || 'Parse failed', 'error')
    }
  }

  const statementTotals = useMemo(() => {
    const credits = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const debits = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const net = credits - debits
    const opening = openingBalance === '' ? null : Number(openingBalance)
    const closing = closingBalance === '' ? null : Number(closingBalance)
    return { credits, debits, net, opening, closing, calculated: opening == null ? null : opening + net,
      variance: opening == null || closing == null ? null : opening + net - closing }
  }, [txns, openingBalance, closingBalance])

  const saveStatementToBooks = async () => {
    if (!txns.length) return toast('Upload and parse a statement first', 'error')
    setBusy(true)
    try {
      const existing = await db.getAll(STORES.bankTxns)
      const fingerprint = (t) => [String(t.date || '').slice(0, 10), Number(t.amount || 0).toFixed(2),
        String(t.description || '').trim().toLowerCase(), String(t.reference || '').trim().toLowerCase()].join('|')
      const seen = new Set(existing.map(fingerprint))
      const statementId = 'stmt-' + Date.now()
      let added = 0
      let duplicates = 0
      for (const txn of txns) {
        const key = fingerprint(txn)
        if (seen.has(key)) { duplicates++; continue }
        seen.add(key)
        await db.add(STORES.bankTxns, {
          ...txn, amount: Number(txn.amount) || 0, accountLabel, statementId,
          statementName: statementName || 'Pasted bank statement', source: 'statement-import',
          reconciled: false, category: '', bookkeepingStatus: 'needs-review',
          importedAt: new Date().toISOString(),
          openingBalance: openingBalance === '' ? null : Number(openingBalance),
          closingBalance: closingBalance === '' ? null : Number(closingBalance),
        })
        added++
      }
      await audit('bank.statement.import', { statementName: statementName || 'Pasted bank statement', added, duplicates, statementId })
      await refresh()
      setSavedCount((n) => n + added)
      toast('Added ' + added + ' bank lines to books' + (duplicates ? ' · skipped ' + duplicates + ' duplicates' : ''), added ? 'success' : 'info')
    } catch (err) {
      toast(err.message || 'Could not save statement to books', 'error')
    } finally {
      setBusy(false)
    }
  }

  const resolveInvoice = (row, idx) => {
    const key = row.txn?.id || String(idx)
    const mid = manualPick[key]
    if (mid) return openInvoices.find((i) => String(i.id) === String(mid)) || null
    return row.invoice || null
  }

  const applyOne = async (row, idx) => {
    const inv = resolveInvoice(row, idx)
    if (!inv || !row?.txn) return toast('Pick an invoice first', 'info')
    setBusy(true)
    try {
      await applyBankMatch({ txn: row.txn, invoice: inv, existingPayments: payments })
      await audit('bank.match', { invoiceId: inv.id, amount: row.txn.amount })
      fireWebhook('payment.recorded', {
        invoiceId: inv.id,
        amount: row.txn.amount,
        source: 'bank_csv',
      })
      setApplied((n) => n + 1)
      setSkipped((s) => ({ ...s, [row.txn?.id || idx]: true }))
      toast(`Payment ${formatMoney(row.txn.amount)} → ${inv.number || inv.id}`, 'success')
      await refresh()
    } catch (err) {
      toast(err.message || 'Apply failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyAllSuggested = async () => {
    const list = matches
      .map((m, idx) => ({ m, idx, inv: resolveInvoice(m, idx) }))
      .filter(({ m, inv, idx }) => inv && (m.score || 0) >= 40 && !skipped[m.txn?.id || idx])
    if (!list.length) return toast('No high-confidence matches left', 'info')
    setBusy(true)
    let n = 0
    try {
      for (const { m, inv } of list) {
        try {
          await applyBankMatch({ txn: m.txn, invoice: inv, existingPayments: payments })
          n++
        } catch {}
      }
      setApplied((a) => a + n)
      await audit('bank.match.bulk', { count: n })
      toast(`Applied ${n} payments from bank CSV`, 'success')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const visible = useMemo(() => {
    const base = (matches.length ? matches : txns.map((t) => ({ txn: t, invoice: null, score: 0, reasons: [] })))
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => !skipped[row.txn?.id || idx])
    return base.filter(({ row, idx }) => {
      const inv = resolveInvoice(row, idx)
      const score = row.score || 0
      if (filter === 'matched') return !!inv
      if (filter === 'unmatched') return !inv
      if (filter === 'high') return !!inv && score >= 70
      return true
    })
  }, [matches, txns, filter, skipped, manualPick])

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Bank statements & finance</h1>
          <p className="subtitle">
            CSV / Excel statements · invoice matching · bookkeeping import · {openInvoices.length} open invoices
            {applied ? ` · ${applied} payments applied` : ''}{savedCount ? ` · ${savedCount} lines added to books` : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !matches.some((m) => m.invoice && (m.score || 0) >= 40)}
          onClick={applyAllSuggested}
        >
          Apply high-confidence (≥40)
        </button>
      </div>

      {txns.length > 0 && (
        <div className="card" style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>
            <strong>{stats.credits}</strong> credits · <strong>{stats.matched}</strong> matched ·{' '}
            <strong style={{ color: '#10b981' }}>{stats.high}</strong> high ·{' '}
            <strong style={{ color: '#f59e0b' }}>{stats.medium}</strong> medium ·{' '}
            <strong>{stats.unmatched}</strong> unmatched
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'high', label: 'High only' },
              { id: 'matched', label: 'Matched' },
              { id: 'unmatched', label: 'Unmatched' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Upload bank statement (CSV or Excel)</label>
          <input type="file" accept=".csv,.txt,.xlsx,.xls,text/csv" className="input" onChange={onFile} />
          <p className="muted" style={{ fontSize: 11 }}>CSV, XLSX and XLS exports supported. Scanned PDF statements are not yet supported.</p>
          {statementName ? <p className="muted" style={{ fontSize: 12 }}>Loaded: <strong>{statementName}</strong></p> : null}
        </div>
        <div>
          <label className="label">Or paste CSV</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Date,Description,Amount,Reference…"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => parseText(raw)}>
            Parse paste
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Matching uses amount, invoice number in description, client name tokens, and phone tail.
          Confidence shows <strong>why</strong> (exact amount, inv #, name…). Unmatched: pick invoice, Apply, or Skip.
        </p>
      </div>

      {txns.length > 0 && (
        <>
          <div className="grid-stats" style={{ marginBottom: 12 }}>
            <div className="card"><div className="muted">Money in</div><strong>{formatMoney(statementTotals.credits)}</strong></div>
            <div className="card"><div className="muted">Money out</div><strong>{formatMoney(statementTotals.debits)}</strong></div>
            <div className="card"><div className="muted">Net movement</div><strong>{formatMoney(statementTotals.net)}</strong></div>
            <div className="card"><div className="muted">Statement lines</div><strong>{txns.length}</strong></div>
          </div>
          <div className="card form-grid cols-3" style={{ marginBottom: 12 }}>
            <div><label className="label">Bank / account label</label><input className="input" value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} /></div>
            <div><label className="label">Opening balance (optional)</label><input className="input" type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="e.g. 12500.00" /></div>
            <div><label className="label">Closing balance (optional)</label><input className="input" type="number" step="0.01" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="e.g. 14320.50" /></div>
            {statementTotals.calculated != null && <p className="muted" style={{ margin: 0 }}>Calculated closing balance: <strong>{formatMoney(statementTotals.calculated)}</strong>{statementTotals.variance != null ? <> · variance to bank: <strong style={{ color: Math.abs(statementTotals.variance) < 0.01 ? '#059669' : '#b91c1c' }}>{formatMoney(statementTotals.variance)}</strong></> : null}</p>}
            <div><button type="button" className="btn btn-primary" disabled={busy} onClick={saveStatementToBooks}>{busy ? 'Saving…' : 'Import transactions into books'}</button></div>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>Imported lines are saved for reconciliation and review. Importing does not automatically declare every debit as an expense or every credit as income.</p>
          </div>
        </>
      )}

      {!txns.length ? (
        <EmptyState title="No transactions yet" hint="Export CSV or Excel from your bank app, then upload it here. You can also paste CSV data." />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Suggested / pick invoice</th>
                <th>Confidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ row, idx }) => {
                const t = row.txn || row
                const inv = resolveInvoice(row, idx)
                const client = inv ? clients.find((c) => String(c.id) === String(inv.clientId)) : null
                const conf = confidenceMeta(row.score)
                const key = t.id || String(idx)
                const reasons = Array.isArray(row.reasons) ? row.reasons : []
                return (
                  <tr key={key}>
                    <td>{t.date ? formatDateZA(t.date) : '—'}</td>
                    <td style={{ maxWidth: 240 }}>
                      <div>{t.description || '—'}</div>
                      {t.reference ? <div className="muted" style={{ fontSize: 11 }}>{t.reference}</div> : null}
                    </td>
                    <td>{formatMoney(t.amount)}</td>
                    <td style={{ minWidth: 200 }}>
                      {inv ? (
                        <div style={{ marginBottom: 6 }}>
                          <strong>{inv.number}</strong>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {client?.name || ''} · due {formatMoney(inv.amountDue ?? inv.total)} ·{' '}
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      ) : null}
                      <select
                        className="input"
                        style={{ fontSize: 12 }}
                        value={manualPick[key] || (row.invoice?.id || '')}
                        onChange={(e) => setManualPick((p) => ({ ...p, [key]: e.target.value }))}
                      >
                        <option value="">— Pick invoice —</option>
                        {openInvoices.map((i) => {
                          const c = clients.find((x) => String(x.id) === String(i.clientId))
                          return (
                            <option key={i.id} value={i.id}>
                              {(i.number || i.id).slice(0, 16)} · {c?.name || '?'} · {formatMoney(i.amountDue ?? i.total)}
                            </option>
                          )
                        })}
                      </select>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                          color: conf.color,
                          background: conf.bg,
                        }}
                      >
                        {conf.label}
                        {row.score ? ` ${Math.min(100, Math.round(row.score))}` : ''}
                      </span>
                      {reasons.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {reasons.slice(0, 4).map((r) => (
                            <span
                              key={r}
                              style={{
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 6,
                                background: 'rgba(148,163,184,.12)',
                                color: '#94a3b8',
                              }}
                              title={r}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy || !resolveInvoice(row, idx)}
                        onClick={() => applyOne(row, idx)}
                      >
                        Apply
                      </button>{' '}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => setSkipped((s) => ({ ...s, [key]: true }))}
                      >
                        Skip
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!visible.length ? (
            <p className="muted" style={{ padding: 16 }}>No rows in this filter (or all skipped).</p>
          ) : null}
        </div>
      )}
    </PageFade>
  )
}
