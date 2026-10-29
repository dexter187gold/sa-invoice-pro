import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
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
  const [categories, setCategories] = useState({})
  const [reviewStatus, setReviewStatus] = useState({})

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

  const classifyDescription = (txn) => {
    const d = String(txn?.description || '').toLowerCase()
    if (/\b(bank fee|service fee|monthly fee|transaction fee|sms fee|cash deposit fee)\b/.test(d)) return 'Bank fees'
    if (/\b(fuel|petrol|diesel|engen|shell|bp |totalenergies|sasol)\b/.test(d)) return 'Fuel & travel'
    if (/\b(microsoft|google workspace|adobe|hosting|domain|subscription|github|cloudflare|vercel)\b/.test(d)) return 'Software & subscriptions'
    if (/\b(electricity|water|municipal|rates|utility)\b/.test(d)) return 'Utilities'
    if (/\b(salary|payroll|wages|staff pay)\b/.test(d)) return 'Salaries'
    if (/\b(office|stationery|printer|toner|paper)\b/.test(d)) return 'Office supplies'
    if (/\b(transfer|own account|inter.?account)\b/.test(d)) return 'Inter-account transfer'
    if (/\b(vat|sars|tax payment)\b/.test(d)) return 'Tax / VAT'
    if (/\b(payment received|eft credit|invoice|customer payment|deposit from|paid by)\b/.test(d) && Number(txn?.amount) > 0) return 'Customer payment'
    if (Number(txn?.amount) > 0) return 'Sales income'
    return 'Supplier expense'
  }

  const onFile = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setStatementName(files.map((f) => f.name).join(', '))
    setBusy(true)
    try {
      const imported = []
      for (const f of files) {
        let text = ''
        if (/\.(xlsx|xls)$/i.test(f.name)) {
          const workbook = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true })
          const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
          text = matrix.map((row) => row.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')
        } else if (/\.pdf$/i.test(f.name)) {
          const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise
          const lines = []
          for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo)
            const content = await page.getTextContent()
            const items = content.items.filter((item) => typeof item.str === 'string' && item.str.trim())
            const grouped = new Map()
            for (const item of items) {
              const y = Math.round(item.transform?.[5] || 0)
              if (!grouped.has(y)) grouped.set(y, [])
              grouped.get(y).push({ x: item.transform?.[4] || 0, text: item.str.trim() })
            }
            for (const [, parts] of [...grouped.entries()].sort((a,b) => b[0]-a[0])) {
              lines.push(parts.sort((a,b) => a.x-b.x).map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim())
            }
          }
          const csvRows = []
          for (const line of lines) {
            const dm = line.match(/(?:^|\s)(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})(?:\s+)(.*)/)
            if (!dm) continue
            const tail = dm[2].match(/(?:R\s*)?(-?\d[\d ,.]*[.,]\d{2})(?:\s*(CR|DR))?\s*$/i)
            if (!tail) continue
            let amountText = tail[1].replace(/\s/g, '')
            if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(amountText)) amountText = amountText.replace(/\./g, '').replace(',', '.')
            else amountText = amountText.replace(/,/g, '')
            let amount = Number(amountText)
            if (!Number.isFinite(amount)) continue
            if (tail[2]?.toUpperCase() === 'DR') amount = -Math.abs(amount)
            const description = dm[2].slice(0, tail.index).trim().replace(/[;,]+$/g, '')
            csvRows.push([dm[1], description || 'Bank transaction', String(amount), ''])
          }
          if (!csvRows.length) throw new Error('Could not detect transaction rows in ' + f.name + '. Scanned PDFs need OCR; export CSV/Excel from the bank.')
          text = ['Date,Description,Amount,Reference', ...csvRows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))].join('\n')
        } else {
          text = await f.text()
        }
        const parsed = parseBankCsv(text)
        const normalized = normalizeBankRows(parsed).map((txn, index) => ({
          ...txn,
          id: 'bank-' + Date.now() + '-' + imported.length + '-' + index,
          sourceFile: f.name,
          suggestedCategory: classifyDescription(txn),
        }))
        imported.push(...normalized)
      }
      if (!imported.length) throw new Error('No valid transactions found in the selected files.')
      const existing = await db.getAll(STORES.bankTxns)
      const fingerprint = (t) => [String(t.date || '').slice(0, 10), Number(t.amount || 0).toFixed(2), String(t.description || '').trim().toLowerCase(), String(t.reference || '').trim().toLowerCase()].join('|')
      const seen = new Set(existing.map(fingerprint))
      const unique = []
      let duplicateCount = 0
      for (const txn of imported) {
        const key = fingerprint(txn)
        if (seen.has(key)) { duplicateCount++; continue }
        seen.add(key)
        unique.push(txn)
      }
      setTxns(unique)
      const matched = matchBankToInvoices(unique, openInvoices, clients)
      const debits = unique.filter((t) => !t.isCredit).map((txn) => ({ txn, invoice: null, score: 0, reasons: ['Expense — category suggested from description'], suggested: false }))
      setMatches([...matched, ...debits])
      setCategories(Object.fromEntries(unique.map((t) => [t.id, t.suggestedCategory || classifyDescription(t)])))
      setSkipped({})
      setManualPick({})
      setRaw(files.length === 1 && /\.(csv|txt)$/i.test(files[0].name) ? await files[0].text() : '')
      toast(files.length + ' file(s): ' + unique.length + ' unique transactions parsed' + (duplicateCount ? ' · ' + duplicateCount + ' duplicate rows skipped' : ''), 'success')
    } catch (err) {
      toast(err.message || 'Could not read these statement files', 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const parseText = (text) => {
    try {
      const { headers, rows } = parseBankCsv(text)
      const normalized = normalizeBankRows({ headers, rows })
      setTxns(normalized)
      const m = matchBankToInvoices(normalized, openInvoices, clients)
      const debits = normalized.filter((t) => !t.isCredit).map((txn) => ({ txn, invoice: null, score: 0, reasons: ['Debit — classify in bookkeeping'], suggested: false }))
      setMatches([...m, ...debits])
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

  const bookkeepingCategories = ['Unclassified', 'Sales income', 'Customer payment', 'Supplier expense', 'Bank fees', 'Fuel & travel', 'Software & subscriptions', 'Office supplies', 'Utilities', 'Salaries', 'Owner transfer', 'Inter-account transfer', 'Loan', 'Tax / VAT', 'Other']

  const saveCategory = async (txn, category) => {
    if (!txn) return
    setBusy(true)
    try {
      const all = await db.getAll(STORES.bankTxns)
      const key = (t) => [String(t.date || '').slice(0, 10), Number(t.amount || 0).toFixed(2), String(t.description || '').trim().toLowerCase(), String(t.reference || '').trim().toLowerCase()].join('|')
      const existing = all.find((t) => key(t) === key(txn))
      if (existing) await db.put(STORES.bankTxns, { ...existing, category, bookkeepingStatus: category === 'Unclassified' ? 'needs-review' : 'classified' })
      else await db.add(STORES.bankTxns, { ...txn, accountLabel, statementName: statementName || 'Pasted bank statement', source: 'statement-import', category, reconciled: false, bookkeepingStatus: category === 'Unclassified' ? 'needs-review' : 'classified', importedAt: new Date().toISOString() })
      await refresh()
      setReviewStatus((s) => ({ ...s, [txn.id]: category === 'Unclassified' ? 'Saved for review' : 'Category saved' }))
      toast('Bookkeeping category saved', 'success')
    } catch (err) {
      toast(err.message || 'Could not save category', 'error')
    } finally { setBusy(false) }
  }

  const createExpenseFromTxn = async (txn) => {
    if (!txn || !(Number(txn.amount) < 0)) return toast('Only debit transactions can be converted to expenses', 'info')
    setBusy(true)
    try {
      const all = await db.getAll(STORES.bankTxns)
      const key = (t) => [String(t.date || '').slice(0, 10), Number(t.amount || 0).toFixed(2), String(t.description || '').trim().toLowerCase(), String(t.reference || '').trim().toLowerCase()].join('|')
      let bankRow = all.find((t) => key(t) === key(txn))
      if (bankRow?.linkedExpenseId) return toast('This bank line already has an expense', 'info')
      const category = categories[txn.id] || 'General'
      const expense = await db.add(STORES.expenses, {
        date: txn.date, description: txn.description || 'Bank payment', amount: Math.abs(Number(txn.amount) || 0),
        category, accountCode: category === 'Bank fees' ? '6900' : '6900',
        vendor: txn.description || '', source: 'bank-statement', bankTxnFingerprint: key(txn),
      })
      if (bankRow) await db.put(STORES.bankTxns, { ...bankRow, linkedExpenseId: expense.id, category, bookkeepingStatus: 'expense-recorded' })
      else await db.add(STORES.bankTxns, { ...txn, amount: Number(txn.amount), accountLabel, statementName: statementName || 'Pasted bank statement', source: 'statement-import', category, linkedExpenseId: expense.id, reconciled: false, bookkeepingStatus: 'expense-recorded', importedAt: new Date().toISOString() })
      await refresh()
      setReviewStatus((s) => ({ ...s, [txn.id]: 'Expense created' }))
      toast('Expense created and linked to bank transaction', 'success')
    } catch (err) { toast(err.message || 'Could not create expense', 'error') }
    finally { setBusy(false) }
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
    if (!(Number(row.txn.amount) > 0) || row.txn.isCredit === false) {
      return toast('Only a positive customer-payment credit can be applied to an invoice', 'error')
    }
    const approved = window.confirm(
      `Record ${formatMoney(row.txn.amount)} from "${row.txn.description || 'Bank transaction'}" against invoice ${inv.number || inv.id} for ${clients.find((c) => String(c.id) === String(inv.clientId))?.name || 'this client'}? This will create a payment and update the invoice balance.`
    )
    if (!approved) return
    setBusy(true)
    try {
      const fingerprint = (t) => [String(t.date || '').slice(0, 10), Number(t.amount || 0).toFixed(2), String(t.description || '').trim().toLowerCase(), String(t.reference || '').trim().toLowerCase()].join('|')
      const prior = await db.getAll(STORES.bankTxns)
      const alreadyApplied = prior.some((t) => t.matchedInvoiceId && fingerprint(t) === fingerprint(row.txn))
      if (alreadyApplied) {
        return toast('This bank transaction has already been applied to an invoice', 'error')
      }
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
          <label className="label">Upload bank statements in bulk (PDF, CSV or Excel)</label>
          <input type="file" accept=".pdf,.csv,.txt,.xlsx,.xls,application/pdf,text/csv" multiple className="input" onChange={onFile} />
          <p className="muted" style={{ fontSize: 11 }}>Select multiple files at once. CSV/XLSX/XLS and text PDFs are supported; scanned PDFs need OCR. Duplicate rows are skipped and all rows remain reviewable before saving.</p>
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
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>Importing statements only saves bank lines for review; it does not change invoice statuses. Matching is a suggestion. Apply a payment one transaction at a time after reviewing and confirming the invoice, amount and customer.</p>
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
                    <td style={{ minWidth: 190 }}>
                      <select className="input" style={{ fontSize: 12, marginBottom: 5 }} value={categories[t.id] || 'Unclassified'} onChange={(e) => setCategories((s) => ({ ...s, [t.id]: e.target.value }))}>
                        {bookkeepingCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => saveCategory(t, categories[t.id] || 'Unclassified')}>Save category</button>
                      {reviewStatus[t.id] ? <div className="muted" style={{ fontSize: 10 }}>{reviewStatus[t.id]}</div> : null}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {Number(t.amount) > 0 ? <button type="button" className="btn btn-primary btn-sm" disabled={busy || !resolveInvoice(row, idx)} onClick={() => applyOne(row, idx)}>Apply payment</button> : <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => createExpenseFromTxn(t)}>Create expense</button>}{' '}
                      <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setSkipped((s) => ({ ...s, [key]: true }))}>Skip</button>
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
