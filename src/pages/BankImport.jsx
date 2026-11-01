import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState, StatusBadge, formatDateZA } from '../components/ui'
import { formatMoney } from '../lib/money'
import {
  parseBankCsv, normalizeBankRows, matchBankToInvoices, applyBankMatch, planImportWrites, commitImportPlan, compareImportBatch,
} from '../lib/bankImport'
import BankImportCompare, { loadExistingBankTxns } from '../components/BankImportCompare'
import BankImportGroups from '../components/BankImportGroups'
import { fireWebhook } from '../lib/webhooks'
import { audit } from '../lib/auditLog'

function confidenceMeta(score) {
  if (score >= 70) return { label: 'Strong', bg: 'rgba(16,185,129,.15)', color: '#059669' }
  if (score >= 40) return { label: 'Possible', bg: 'rgba(245,158,11,.15)', color: '#b45309' }
  return { label: 'Weak', bg: 'rgba(148,163,184,.15)', color: '#64748b' }
}

export default function BankImport() {
  const { toast, refresh, invoices, clients } = useApp()
  const [raw, setRaw] = useState('')
  const [txns, setTxns] = useState([])
  const [matches, setMatches] = useState([])
  const [busy, setBusy] = useState(false)
  const [accountLabel, setAccountLabel] = useState('Company bank account')
  const [statementName, setStatementName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [compareIncoming, setCompareIncoming] = useState([])
  const [existingBank, setExistingBank] = useState([])
  const [categories, setCategories] = useState({})
  const [skipped, setSkipped] = useState({})
  const [manualPick, setManualPick] = useState({})
  const [savedCount, setSavedCount] = useState(0)
  const [dirFilter, setDirFilter] = useState('all')
  const [applyingId, setApplyingId] = useState(null)

  const openInvoices = useMemo(
    () => (invoices || []).filter((i) => !['paid', 'cancelled', 'void'].includes(String(i.status || '').toLowerCase())),
    [invoices],
  )

  const classifyDescription = (txn) => {
    const d = String(txn?.description || '').toLowerCase()
    if (/\b(bank fee|service fee|monthly fee|admin fee)\b/.test(d)) return 'Bank charges'
    if (/\b(fuel|petrol|diesel|engen|shell|sasol|total)\b/.test(d)) return 'Fuel'
    if (/\b(electricity|water|municipal|rates|eskom)\b/.test(d)) return 'Utilities'
    if (/\b(salary|wages|payroll)\b/.test(d)) return 'Payroll'
    if (/\b(rent|lease)\b/.test(d)) return 'Rent'
    if (/\b(insurance)\b/.test(d)) return 'Insurance'
    if (/\b(stationery|office|paper)\b/.test(d)) return 'Office supplies'
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
            let amount = tail[1].replace(/\s/g, '').replace(/,(?=\d{3})/g, '').replace(',', '.')
            if (/DR/i.test(tail[2] || '')) amount = '-' + amount.replace(/^-/, '')
            csvRows.push(`"${dm[1]}","${dm[2].slice(0, Math.max(0, dm[2].length - tail[0].length)).trim()}","${amount}"`)
          }
          text = 'Date,Description,Amount\n' + csvRows.join('\n')
        } else {
          text = await f.text()
        }
        const { headers, rows } = parseBankCsv(text)
        const normalized = normalizeBankRows({ headers, rows }).map((txn, index) => ({
          ...txn,
          id: 'bank-' + Date.now() + '-' + imported.length + '-' + index,
          suggestedCategory: classifyDescription(txn),
        }))
        imported.push(...normalized)
      }
      if (!imported.length) throw new Error('No valid transactions found in the selected files.')
      const existing = await loadExistingBankTxns()
      setExistingBank(existing || [])
      setCompareIncoming(imported)
      setTxns(imported)
      const matched = matchBankToInvoices(imported, openInvoices, clients)
      const debits = imported.filter((t) => !t.isCredit).map((txn) => ({
        txn, invoice: null, score: 0, reasons: ['Debit — classify in bookkeeping'], suggested: false,
      }))
      setMatches([...matched, ...debits])
      setCategories(Object.fromEntries(imported.map((t) => [t.id, t.suggestedCategory || classifyDescription(t)])))
      setSkipped({})
      setManualPick({})
      toast(files.length + ' file(s): ' + imported.length + ' transactions parsed — review compare panel before saving to books', 'success')
    } catch (err) {
      toast(err.message || 'Could not read these statement files', 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const quickSaveAllNew = async () => {
    if (!txns.length) return toast('Parse a statement first', 'info')
    setBusy(true)
    try {
      const existing = existingBank?.length ? existingBank : await loadExistingBankTxns()
      const { rows } = compareImportBatch(txns, existing || [])
      const decided = rows.map((r) => ({
        ...r,
        action: r.status === 'new' ? 'import' : 'skip',
      }))
      const plan = planImportWrites(decided)
      if (!plan.toAdd?.length) {
        toast(plan.skipped?.length ? `No new lines — ${plan.skipped.length} already in books or skipped` : 'Nothing new to save', 'info')
        return
      }
      const result = await commitImportPlan(plan, { accountLabel, statementName: statementName || 'Bank statement' })
      setSavedCount((n) => n + 1)
      await refresh?.()
      toast(`Saved ${result.added} new bank line(s) · skipped ${result.skipped}`, 'success')
    } catch (e) {
      toast(e?.message || 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyPaymentMatch = async (row) => {
    if (!row?.invoice || !row?.txn) return toast('No invoice match on this line', 'error')
    if (!(Number(row.txn.amount) > 0)) return toast('Only money-in lines can be applied as payments', 'error')
    setApplyingId(row.txn.id)
    try {
      await applyBankMatch(row.txn, row.invoice)
      setSavedCount((n) => n + 1)
      await refresh?.()
      toast(`Payment applied to ${row.invoice.number}`, 'success')
    } catch (e) {
      toast(e?.message || 'Could not apply payment', 'error')
    } finally {
      setApplyingId(null)
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
        <input className="input" type="file" accept=".csv,.txt,.xlsx,.xls,.pdf" multiple onChange={onFile} disabled={busy} />
        <label className="label">Or paste CSV</label>
        <textarea className="input" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Date,Description,Amount..." />
        <button type="button" className="btn btn-outline" disabled={busy || !raw.trim()} onClick={() => parseText(raw)}>Parse pasted CSV</button>
        {statementName ? <p className="muted" style={{ fontSize: 12 }}>File: {statementName}</p> : null}
      </div>

      {txns.length ? (
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 12 }}>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Money in</div><strong style={{ color: 'var(--success)' }}>{formatMoney(statementTotals.credits)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Money out</div><strong style={{ color: 'var(--danger)' }}>{formatMoney(statementTotals.debits)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Net</div><strong>{formatMoney(statementTotals.net)}</strong></div>
          <div className="card" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 11 }}>Lines</div><strong>{txns.length}</strong></div>
        </div>
      ) : null}

      {txns.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div className="view-toggle">
            <button type="button" className={dirFilter === 'all' ? 'on' : ''} onClick={() => setDirFilter('all')}>All</button>
            <button type="button" className={dirFilter === 'in' ? 'on' : ''} onClick={() => setDirFilter('in')}>Money in</button>
            <button type="button" className={dirFilter === 'out' ? 'on' : ''} onClick={() => setDirFilter('out')}>Money out</button>
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={quickSaveAllNew}>
            {busy ? 'Saving…' : 'Save all new lines to books'}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>Duplicates stay skipped. Use compare panel for line-by-line control.</span>
        </div>
      ) : null}

      {txns.length ? (
        <BankImportGroups txns={txns} toast={toast} refresh={refresh} />
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
            setSavedCount((n) => n + 1)
            const latest = await loadExistingBankTxns()
            setExistingBank(latest || [])
            await refresh?.()
            try { await audit('bank_import_commit', { accountLabel, statementName }) } catch {}
            try { await fireWebhook('bank.import', { accountLabel, statementName }) } catch {}
          }}
        />
      ) : null}

      {!txns.length ? (
        <EmptyState title="No transactions yet" hint="Export CSV or Excel from your bank app, then upload it here. You will review duplicates before anything is saved." />
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Statement lines & invoice match suggestions</h3>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(matches.length ? matches : txns.map((txn) => ({ txn, invoice: null, score: 0 })))
                  .filter((row) => {
                    const a = Number((row.txn || row).amount) || 0
                    if (dirFilter === 'in') return a > 0
                    if (dirFilter === 'out') return a < 0
                    return true
                  })
                  .slice(0, 120).map((row, idx) => {
                  const t = row.txn || row
                  const conf = confidenceMeta(row.score)
                  const amt = Number(t.amount) || 0
                  return (
                    <tr key={t.id || idx}>
                      <td>{t.date ? formatDateZA(t.date) : '—'}</td>
                      <td style={{ maxWidth: 240 }}>
                        <div>{t.description || '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          <span style={{ color: amt >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{amt >= 0 ? 'IN' : 'OUT'}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: amt >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(amt)}</td>
                      <td>{row.invoice ? <strong>{row.invoice.number}</strong> : <span className="muted">—</span>}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, background: conf.bg, color: conf.color }}>{conf.label}</span>
                      </td>
                      <td>
                        {row.invoice && amt > 0 ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={applyingId === t.id}
                            onClick={() => applyPaymentMatch(row)}
                          >
                            {applyingId === t.id ? '…' : 'Apply payment'}
                          </button>
                        ) : amt < 0 ? (
                          <span className="muted" style={{ fontSize: 11 }}>Expense via groups ↑</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
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
