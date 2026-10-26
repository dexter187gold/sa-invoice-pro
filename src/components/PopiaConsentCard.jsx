import React, { useState } from 'react'
import { recordConsent, consentsForClient } from '../lib/popia'

export default function PopiaConsentCard({ clientId, toast }) {
  const [type, setType] = useState('processing')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState(() => (clientId ? consentsForClient(clientId) : []))

  if (!clientId) return null

  const save = () => {
    recordConsent({ clientId, type, note })
    setRows(consentsForClient(clientId))
    setNote('')
    toast?.('Consent logged', 'success')
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <strong>POPIA consent log</strong>
      <p className="muted" style={{ fontSize: 12 }}>Record processing / marketing consent for this client.</p>
      <div className="form-grid" style={{ gap: 8 }}>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="processing">Processing (service)</option>
          <option value="marketing">Marketing</option>
          <option value="storage">Device / data storage</option>
        </select>
        <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="btn btn-outline btn-sm" onClick={save}>Log consent</button>
      </div>
      {rows.slice(0, 5).map((r) => (
        <div key={r.id} className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {String(r.at).slice(0, 10)} · {r.type}{r.note ? ` · ${r.note}` : ''}
        </div>
      ))}
    </div>
  )
}
