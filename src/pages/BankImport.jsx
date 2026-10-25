import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade, EmptyState, StatusBadge, formatDateZA } from '../components/ui'
import { formatMoney } from '../lib/money'
import {
  parseBankCsv, normalizeBankRows, matchBankToInvoices, applyBankMatch,
} from '../lib/bankImport'
import { fireWebhook } from '../lib/webhooks'
import { audit } from '../lib/auditLog'

export default function BankImport() {
  const { invoices, clients, payments, refresh, toast } = useApp()
  const [raw, setRaw] = useState('')
  const [txns, setTxns] = useState([])
  const [matches, setMatches] = useState([])
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(0)

  const openInvoices = useMemo(
    () => invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status || 'unpaid')),
    [invoices],
  )

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const text = await f.text()
    setRaw(text)
    parseText(text)
  }

  const parseText = (text) => {
    try {
      const { headers, rows } = parseBankCsv(text)
      const normalized = normalizeBankRows({ headers, rows })
      setTxns(normalized)
      const m = matchBankToInvoices(normalized, openInvoices, clients)
      setMatches(m)
      toast(`${normalized.length} transactions · ${m.filter((x) => x.invoice).length} suggested matches`, 'success')
    } catch (err) {
      toast(err.message || 'Parse failed', 'error')
    }
  }

  const applyOne = async (row) => {
    if (!row?.invoice || !row?.txn) return toast('No match', 'info')
    setBusy(true)
    try {
      await applyBankMatch({ txn: row.txn, invoice: row.invoice, existingPayments: payments })
      await audit('bank.match', { invoiceId: row.invoice.id, amount: row.txn.amount })
      fireWebhook('payment.recorded', {
        invoiceId: row.invoice.id,
        amount: row.txn.amount,
        source: 'bank_csv',
      })
      setApplied((n) => n + 1)
      toast('Payment applied', 'success')
      await refresh()
    } catch (err) {
      toast(err.message || 'Apply failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyAllSuggested = async () => {
    const list = matches.filter((m) => m.invoice && (m.score || 0) >= 40)
    if (!list.length) return toast('No high-confidence matches', 'info')
    setBusy(true)
    let n = 0
    try {
      for (const row of list) {
        try {
          await applyBankMatch({ txn: row.txn, invoice: row.invoice, existingPayments: payments })
          n++
        } catch {}
      }
      setApplied((a) => a + n)
      await audit('bank.match.bulk', { count: n })
      toast(`Applied ${n} payments`, 'success')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>Bank CSV import</h1>
          <p className="subtitle">
            FNB / Standard / ABSA / Nedbank-style CSV · match open invoices · {openInvoices.length} open
            {applied ? ` · ${applied} applied this session` : ''}
          </p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || !matches.some((m) => m.invoice && m.score >= 40)} onClick={applyAllSuggested}>
          Apply high-confidence
        </button>
      </div>

      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <div>
          <label className="label">Upload bank CSV</label>
          <input type="file" accept=".csv,text/csv,text/plain" className="input" onChange={onFile} />
        </div>
        <div>
          <label className="label">Or paste CSV</label>
          <textarea
            className="input"
            rows={5}
            placeholder="Date,Description,Amount,..."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <button type="button" className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => parseText(raw)}>
            Parse paste
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Credits (money in) are matched to unpaid / partial / overdue invoices by amount, reference, and client name.
        </p>
      </div>

      {!txns.length ? (
        <EmptyState title="No transactions yet" hint="Export CSV from your bank app, then upload here." />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Suggested invoice</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(matches.length ? matches : txns.map((t) => ({ txn: t, invoice: null, score: 0 }))).map((row, i) => {
                const t = row.txn || row
                const inv = row.invoice
                const client = inv ? clients.find((c) => String(c.id) === String(inv.clientId)) : null
                return (
                  <tr key={t.id || i}>
                    <td>{t.date ? formatDateZA(t.date) : '—'}</td>
                    <td style={{ maxWidth: 220 }}>{t.description || t.reference || '—'}</td>
                    <td>{formatMoney(t.amount)}</td>
                    <td>
                      {inv ? (
                        <>
                          <strong>{inv.number}</strong>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {client?.name || ''} · <StatusBadge status={inv.status} />
                          </div>
                        </>
                      ) : (
                        <span className="muted">No match</span>
                      )}
                    </td>
                    <td>{row.score != null ? Math.min(100, Math.round(row.score || 0)) + '%' : '—'}</td>
                    <td>
                      {inv ? (
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => applyOne(row)}>
                          Apply
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageFade>
  )
}
