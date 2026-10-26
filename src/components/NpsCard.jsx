import React, { useState } from 'react'
import { saveNpsScore, npsSummary, loadNpsLog } from '../lib/nps'

export default function NpsCard({ clients = [], toast }) {
  const [score, setScore] = useState(9)
  const [clientId, setClientId] = useState('')
  const [note, setNote] = useState('')
  const summary = npsSummary(loadNpsLog())

  const submit = () => {
    saveNpsScore({ clientId: clientId || null, score, note })
    setNote('')
    toast?.(`Saved score ${score}/10`, 'success')
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <strong>Client satisfaction (NPS)</strong>
      <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
        Track after job handover — {summary.count
          ? `avg ${summary.avg}/10 · NPS ${summary.nps} · ${summary.count} scores`
          : 'no scores yet'}
      </p>
      <div className="form-grid" style={{ gap: 8 }}>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Score 0–10</span>
          <input className="input" type="range" min={0} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} />
          <span style={{ fontWeight: 700 }}>{score}</span>
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Client (optional)</span>
          <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— General —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Note</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What went well / fix next" />
        </label>
        <button type="button" className="btn btn-primary" onClick={submit}>Save score</button>
      </div>
    </div>
  )
}
