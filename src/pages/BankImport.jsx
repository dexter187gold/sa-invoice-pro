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
import BankImportCompare, { loadExistingBankTxns } from '../components/BankImportCompare'
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
  const [existingBank, setExistingBank] = useState([])
  const [compareIncoming, setCompareIncoming] = useState([])

  const openInvoices = useMemo(
    () => invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')),
    [invoices],
  )

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
            for (const [, parts] of [...grouped.entries()].sort((a, b) => b[0] - a[0])) {
              lines.push(parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim())
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
          if (!csvRows.length) throw new Error('Could not detect transaction rows in ' + f.name)
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
      setExistingBank(existing || [])
      setCompareIncoming(imported)
      setTxns(imported)
      const matched = matchBankToInvoices(imported, openInvoices, clients)
      const debits = imported.filter((t) => !t.isCredit).map((txn) => ({
        txn, invoice: null, score: 0, reasons: ['Expense — category suggested from description'], suggested: false,
      }))
      setMatches([...matched, ...debits])
      setCategories(Object.fromEntries(imported.map((t) => [t.id, t.suggestedCategory || classifyDescription(t)])))
      setSkipped({})
      setManualPick({})
      setRaw(files.length === 1 && /\.(csv|txt)$/i.test(files[0].name) ? await files[0].text() : '')
      toast(files.length + ' file(s): ' + imported.length + ' transactions parsed — review compare panel before saving to books', 'success')
    } catch (err) {
      toast(err.message || 'Could not read these statement files', 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const parseText = async (text) => {
    try {
      const { headers, rows } = parseBankCsv(text)
      const normalized = normalizeBankRows({ headers, rows }).map((txn, index) => ({
        ...txn,
        id: 'bank-paste-' + Date.now() + '-' + index,
        suggestedCategory: classifyDescription(txn),
      }))
      const existing = await loadExistingBankTxns()
      setExistingBank(existing || [])
      setCompareIncoming(normalized)
      setTxns(normalized)
      const m = matchBankToInvoices(normalized, openInvoices, clients)
      const debits = normalized.filter((t) => !t.isCredit).map((txn) => ({
        txn, invoice: null, score: 0, reasons: ['Debit — classify in bookkeeping'], suggested: false,
      }))
      setMatches([...m, ...debits])
      setSkipped({})
      setManualPick({})
      toast(`${normalized.length} transactions · review compare panel before saving`, 'success')
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
    return {
      credits, debits, net, opening, closing,
      calculated: opening == null ? null : opening + net,
      variance: opening == null || closing == null ? null : opening + net - closing,
    }
  }, [txns, openingBalance, closingBalance])

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Bank import</h1>
          <p className="subtitle">CSV / Excel / PDF statements · date · amount in/out · description · safe compare before save</p>
        </div>
      </div>

      <div className="card form-grid" style={{ marginBottom: 12 }}>
        <label className="label">Account label</label>
        <input className="input" value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} placeholder="e.g. FNB Business Cheque" />
        <label className="label">Upload statement (CSV, Excel, or PDF)</label>
        <input className="input" type="file" accept=".csv,.txt,.xlsx,.xls,.pdf" multiple disabled={busy} onChange={onFile} />
        <label className="label">Or paste CSV</label>
        <textarea className="input" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Date,Description,Amount..." />
        <button type="button" className="btn btn-outline" disabled={busy || !raw.trim()} onClick={() => parseText(raw)}>Parse pasted CSV</button>
        {statementName ? <p className="muted" style={{ fontSize: 12 }}>File: {statementName}</p> : null}
      </div>

      {txns.length ? (
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Money in</div><strong>{formatMoney(statementTotals.credits)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Money out</div><strong>{formatMoney(statementTotals.debits)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Net</div><strong>{formatMoney(statementTotals.net)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Lines</div><strong>{txns.length}</strong></div>
        </div>
      ) : null}

      {compareIncoming.length ? (
        <BankImportCompare
          incoming={compareIncoming}
          existing={existingBank}
          accountLabel={accountLabel}
          statementName={statementName || 'Bank statement'}
          toast={toast}
          busy={busy}
          setBusy={setBusy}
          onCommitted={async () => {
            await refresh()
            const latest = await loadExistingBankTxns()
            setExistingBank(latest || [])
            setSavedCount((n) => n + 1)
          }}
        />
      ) : null}

      {!txns.length ? (
        <EmptyState title="No transactions yet" hint="Export CSV or Excel from your bank app, then upload it here. You will review duplicates before anything is saved." />
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Invoice match suggestions (credits only)</h3>
          <p className="muted" style={{ fontSize: 13 }}>Matching is a suggestion only. Apply payments one at a time after review. Statement import itself does not change invoice statuses.</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Suggested invoice</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {(matches.length ? matches : txns.map((txn) => ({ txn, invoice: null, score: 0 }))).slice(0, 80).map((row, idx) => {
                  const t = row.txn || row
                  const conf = confidenceMeta(row.score)
                  return (
                    <tr key={t.id || idx}>
                      <td>{t.date ? formatDateZA(t.date) : '—'}</td>
                      <td style={{ maxWidth: 240 }}>
                        <div>{t.description || '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{Number(t.amount) >= 0 ? 'In' : 'Out'}</div>
                      </td>
                      <td>{formatMoney(t.amount)}</td>
                      <td>{row.invoice ? <strong>{row.invoice.number}</strong> : <span className="muted">—</span>}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, background: conf.bg, color: conf.color }}>{conf.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {savedCount ? <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Books updated {savedCount} time(s) this session via compare panel.</p> : null}
        </div>
      )}
    </PageFade>
  )
}
