import React, { useMemo, useState } from 'react'
import Modal from './Modal'
import { formatMoney } from '../lib/money'
import {
  canIssueCreditNote,
  maxCreditAmount,
  remainingBalance,
  issueCreditNote,
} from '../lib/creditNote'

export default function CreditNoteModal({ invoice, open, onClose, onIssued, toast }) {
  const max = useMemo(() => (invoice ? maxCreditAmount(invoice) : 0), [invoice])
  const balance = useMemo(() => (invoice ? remainingBalance(invoice) : 0), [invoice])
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  React.useEffect(() => {
    if (open && invoice) {
      setAmount(String(balance > 0 ? balance : max))
      setReason('')
    }
  }, [open, invoice, balance, max])

  if (!open || !invoice) return null
  if (!canIssueCreditNote(invoice)) {
    return (
      <Modal title="Credit note" onClose={onClose}>
        <p className="muted">This invoice cannot receive a credit note (void/draft or zero balance).</p>
        <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
      </Modal>
    )
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    setBusy(true)
    try {
      const r = await issueCreditNote(invoice, {
        amount: Number(amount),
        reason: reason || 'Adjustment',
      })
      toast?.(`Credit note ${r.creditNote.number} issued for ${formatMoney(r.creditNote.amount)}`, 'success')
      onIssued?.(r)
      onClose?.()
    } catch (err) {
      toast?.(err?.message || 'Could not issue credit note', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Credit note · ${invoice.number || invoice.id}`} onClose={onClose}>
      <form onSubmit={submit} className="form-grid" style={{ gap: 10 }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Balance due {formatMoney(balance)} · Max credit {formatMoney(max)}. Credits reduce what the client owes; they do not create a bank payment.
        </p>
        <label className="label">Amount (ZAR)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0.01"
          max={max}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAmount(String(balance || max))}>
            Full balance
          </button>
          {balance > 0 && max > balance ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAmount(String(max))}>
              Max (incl. paid)
            </button>
          ) : null}
        </div>
        <label className="label">Reason</label>
        <textarea
          className="input"
          rows={3}
          placeholder="e.g. Returned part, pricing correction, goodwill"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Issuing…' : 'Issue credit note'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
