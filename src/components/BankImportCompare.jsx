import React, { useMemo, useState } from 'react'
import { formatMoney } from '../lib/money'
import { formatDateZA } from './ui'
import { compareImportBatch, planImportWrites, commitImportPlan } from '../lib/bankImport'
import * as db from '../lib/db'
import { STORES } from '../lib/db'

const ACTION_LABELS = {
  import: 'Import as new',
  skip: 'Skip (keep existing)',
  import_anyway: 'Import anyway (force)',
  import_as_new: 'Import as new line',
  update_description: 'Update description only',
  use_existing_amount: 'Keep existing amount',
  fix_amount: 'Import with statement amount',
  review: 'Choose action…',
}

const STATUS_STYLE = {
  new: { bg: 'rgba(16,185,129,.12)', color: '#059669', label: 'New' },
  exact_duplicate: { bg: 'rgba(239,68,68,.12)', color: '#b91c1c', label: 'Duplicate' },
  same_date_amount: { bg: 'rgba(245,158,11,.14)', color: '#b45309', label: 'Possible duplicate' },
  amount_mismatch: { bg: 'rgba(239,68,68,.14)', color: '#9f1239', label: 'Amount check' },
}

/**
 * Review statement lines against existing bankTxns before any write.
 */
export default function BankImportCompare({
  incoming = [],
  existing = [],
  accountLabel = 'Company bank account',
  statementName = 'Bank statement',
  toast,
  onCommitted,
  busy,
  setBusy,
}) {
  const compared = useMemo(() => compareImportBatch(incoming, existing), [incoming, existing])
  const [rows, setRows] = useState(() => compared.rows)
  const [filter, setFilter] = useState('all')
  const [localBusy, setLocalBusy] = useState(false)

  React.useEffect(() => {
    setRows(compared.rows)
  }, [compared])

  const summary = compared.summary

  const visible = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'issues') return r.status !== 'new'
    return r.status === filter
  })

  const setAction = (idx, action) => {
    setRows((list) => list.map((r, i) => (i === idx ? { ...r, action } : r)))
  }

  const setTxnAmount = (idx, amount) => {
    setRows((list) =>
      list.map((r, i) =>
        i === idx
          ? {
              ...r,
              txn: { ...r.txn, amount: Number(amount) || 0, isCredit: Number(amount) > 0, direction: Number(amount) >= 0 ? 'in' : 'out' },
              action: 'fix_amount',
            }
          : r,
      ),
    )
  }

  const bulk = (status, action) => {
    setRows((list) => list.map((r) => (r.status === status ? { ...r, action } : r)))
  }

  const commit = async () => {
    if (localBusy || busy) return
    setLocalBusy(true)
    setBusy?.(true)
    try {
      const prepared = rows.map((r) => {
        let action = r.action
        if (!action || action === 'review') {
          action = r.status === 'new' ? 'import' : 'skip'
        }
        return { ...r, action }
      })
      const plan = planImportWrites(prepared)
      if (!(plan.toAdd?.length || plan.toUpdate?.length)) {
        toast?.(
          plan.skipped?.length
            ? `Nothing to save — ${plan.skipped.length} line(s) skipped. Change actions to Import, then try again.`
            : 'Nothing to save — no importable lines.',
          'info',
        )
        return
      }
      const result = await commitImportPlan(plan, { accountLabel, statementName })
      const msg =
        `Saved ${result.added} new · updated ${result.updated} · skipped ${result.skipped}` +
        (summary.exact || summary.soft || summary.amount
          ? ' (review decisions applied — nothing overwritten silently)'
          : '')
      toast?.(msg, result.added || result.updated ? 'success' : 'info')
      onCommitted?.(result)
    } catch (e) {
      console.error('Bank import commit failed', e)
      toast?.(e?.message || 'Import commit failed', 'error')
    } finally {
      setLocalBusy(false)
      setBusy?.(false)
    }
  }

  if (!incoming.length) return null

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0 }}>Compare with existing bank lines</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Statement lines are matched by <strong>date</strong>, <strong>amount in/out</strong>, and <strong>description</strong>.
        Existing account data is never overwritten unless you choose an update action below.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {summary.total} lines · {summary.neu} new · {summary.exact} exact duplicates · {summary.soft} possible · {summary.amount} amount checks
        </span>
        <select className="input" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Show all</option>
          <option value="issues">Issues only</option>
          <option value="new">New only</option>
          <option value="exact_duplicate">Exact duplicates</option>
          <option value="same_date_amount">Possible duplicates</option>
          <option value="amount_mismatch">Amount checks</option>
        </select>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk('exact_duplicate', 'skip')}>Skip all exact duplicates</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk('same_date_amount', 'skip')}>Skip all possible duplicates</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => bulk('new', 'import')}>Import all new</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Date</th>
              <th>Description</th>
              <th>In / Out</th>
              <th>Amount</th>
              <th>Existing</th>
              <th>Your decision</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const globalIdx = rows.indexOf(r)
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.new
              const amt = Number(r.txn.amount) || 0
              return (
                <tr key={r.txn.id || globalIdx}>
                  <td>
                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4, maxWidth: 180 }}>{r.message}</div>
                  </td>
                  <td>{r.txn.date ? formatDateZA(r.txn.date) : '—'}</td>
                  <td style={{ maxWidth: 220 }}>
                    <div>{r.txn.description || '—'}</div>
                    {r.txn.reference ? <div className="muted" style={{ fontSize: 11 }}>{r.txn.reference}</div> : null}
                  </td>
                  <td>{amt >= 0 ? 'In' : 'Out'}</td>
                  <td>
                    {r.status === 'amount_mismatch' ? (
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        style={{ width: 110 }}
                        value={amt}
                        onChange={(e) => setTxnAmount(globalIdx, e.target.value)}
                      />
                    ) : (
                      formatMoney(amt)
                    )}
                  </td>
                  <td style={{ maxWidth: 200, fontSize: 12 }}>
                    {r.existing ? (
                      <>
                        <div>{formatDateZA(r.existing.date)} · {formatMoney(r.existing.amount)}</div>
                        <div className="muted">{r.existing.description || '—'}</div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ minWidth: 180 }}
                      value={r.action === 'review' ? '' : r.action}
                      onChange={(e) => setAction(globalIdx, e.target.value)}
                    >
                      {r.action === 'review' ? <option value="">Choose…</option> : null}
                      {(r.options || ['import', 'skip']).map((opt) => (
                        <option key={opt} value={opt}>
                          {ACTION_LABELS[opt] || opt}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" disabled={busy || localBusy} onClick={(e) => { e.preventDefault(); e.stopPropagation(); commit() }}>
          {busy || localBusy ? 'Saving…' : 'Apply decisions to books'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || localBusy} onClick={() => bulk('new', 'import')}>
          Mark all new → Import
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          Only lines marked import / update will change data. Skip leaves existing books untouched.
        </span>
      </div>
    </div>
  )
}

/** Load existing bank lines for compare (helper for parent pages). */
export async function loadExistingBankTxns() {
  return db.getAll(STORES.bankTxns)
}
