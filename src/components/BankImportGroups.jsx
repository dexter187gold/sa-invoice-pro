import React, { useMemo, useState } from 'react'
import { formatMoney } from '../lib/money'
import {
  groupBankTxnsByDescription,
  createMissingEntriesFromGroups,
} from '../lib/bankImport'
import * as db from '../lib/db'
import { STORES } from '../lib/db'

/**
 * Statement breakdown: money in/out totals, description groups, create missing expenses.
 */
export default function BankImportGroups({ txns = [], toast, refresh }) {
  const [dirFilter, setDirFilter] = useState('all')
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => groupBankTxnsByDescription(txns), [txns])
  const totals = useMemo(() => {
    let inn = 0
    let out = 0
    let inCount = 0
    let outCount = 0
    for (const t of txns) {
      const a = Number(t.amount) || 0
      if (a > 0) {
        inn += a
        inCount++
      } else if (a < 0) {
        out += Math.abs(a)
        outCount++
      }
    }
    return { in: inn, out, net: inn - out, inCount, outCount }
  }, [txns])

  const filteredGroups = useMemo(() => {
    if (dirFilter === 'in') return groups.filter((g) => g.totalIn > 0 && g.totalOut === 0)
    if (dirFilter === 'out') return groups.filter((g) => g.totalOut > 0)
    return groups
  }, [groups, dirFilter])

  const createExpenses = async () => {
    const outGroups = groups.filter((g) => g.totalOut > 0)
    if (!outGroups.length) return toast?.('No money-out lines to create expenses from', 'info')
    setBusy(true)
    try {
      const existing = (await db.getAll(STORES.expenses)) || []
      const r = await createMissingEntriesFromGroups(outGroups, existing, {
        categoryFor: (txn) => {
          const d = String(txn?.description || '').toLowerCase()
          if (/bank fee|service fee|monthly fee/.test(d)) return '6700'
          if (/fuel|petrol|diesel|engen|shell|sasol/.test(d)) return '6300'
          if (/electricity|water|municipal|rates/.test(d)) return '6400'
          return '6900'
        },
      })
      await refresh?.()
      toast?.(
        r.created
          ? `Created ${r.created} expense entr${r.created === 1 ? 'y' : 'ies'} from money-out lines`
          : 'All money-out lines already have matching expenses',
        r.created ? 'success' : 'info',
      )
    } catch (e) {
      toast?.(e?.message || 'Could not create expenses', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!txns.length) return null

  return (
    <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0 }}>Statement breakdown</h3>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>
            Money in and money out are both imported. Credits can match invoices; debits can become expenses.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`btn btn-sm ${dirFilter === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDirFilter('all')}>
            All ({txns.length})
          </button>
          <button type="button" className={`btn btn-sm ${dirFilter === 'in' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDirFilter('in')}>
            Money in ({totals.inCount})
          </button>
          <button type="button" className={`btn btn-sm ${dirFilter === 'out' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDirFilter('out')}>
            Money out ({totals.outCount})
          </button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginTop: 12 }}>
        <div className="card stat">
          <div className="label">Money in</div>
          <div className="value" style={{ color: 'var(--green, #059669)' }}>{formatMoney(totals.in)}</div>
        </div>
        <div className="card stat">
          <div className="label">Money out</div>
          <div className="value" style={{ color: '#b91c1c' }}>{formatMoney(totals.out)}</div>
        </div>
        <div className="card stat">
          <div className="label">Net</div>
          <div className="value">{formatMoney(totals.net)}</div>
        </div>
        <div className="card stat">
          <div className="label">Groups</div>
          <div className="value">{groups.length}</div>
        </div>
      </div>

      <h4 style={{ margin: '16px 0 8px' }}>Similar descriptions (groups)</h4>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Lines with similar narratives are grouped. Create expense entries for money-out groups not already in Expenses.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !totals.outCount} onClick={createExpenses}>
          {busy ? 'Creating…' : 'Create missing expense entries'}
        </button>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 280 }}>
        <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th>Group</th>
              <th>Lines</th>
              <th>Direction</th>
              <th>In</th>
              <th>Out</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.slice(0, 40).map((g) => (
              <tr key={g.key}>
                <td style={{ maxWidth: 260 }}>
                  <strong style={{ fontSize: 12 }}>{g.label}</strong>
                  <div className="muted" style={{ fontSize: 11 }}>{g.key}</div>
                </td>
                <td>{g.count}</td>
                <td>{g.direction === 'out' ? 'Out' : g.direction === 'in' ? 'In' : 'Mixed'}</td>
                <td>{g.totalIn ? formatMoney(g.totalIn) : '—'}</td>
                <td>{g.totalOut ? formatMoney(g.totalOut) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
