import React, { useEffect, useState } from 'react'
import {
  ensureTimeLog, startClock, stopClock, totalMinutes, formatDuration, labourFromMinutes,
} from '../lib/timeClock'

export default function TimeClock({ value, onChange, hourlyRate = 450, onApplyLabour }) {
  const [tick, setTick] = useState(0)
  const tl = ensureTimeLog({ timeLog: value })

  useEffect(() => {
    if (!tl.runningSince) return undefined
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [tl.runningSince])

  const mins = totalMinutes(tl)
  void tick

  const start = () => onChange?.(startClock(tl))
  const stop = () => onChange?.(stopClock(tl))

  const apply = () => {
    const amount = labourFromMinutes(mins, hourlyRate)
    onApplyLabour?.(amount, mins)
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <strong>Time clock</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            {tl.runningSince ? '● Running' : '○ Stopped'} · total {formatDuration(mins)}
            {hourlyRate ? ` · @ R${hourlyRate}/h → R${labourFromMinutes(mins, hourlyRate).toFixed(2)}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!tl.runningSince ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={start}>Start</button>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={stop}>Stop</button>
          )}
          {onApplyLabour && mins > 0 ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={apply}>Apply as labour</button>
          ) : null}
        </div>
      </div>
      {(tl.segments || []).length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12 }}>
          {tl.segments.slice(-8).map((s) => (
            <li key={s.id}>
              {formatDuration(s.minutes)}
              {s.startedAt ? ` · ${String(s.startedAt).slice(0, 16).replace('T', ' ')}` : ''}
              {s.note ? ` · ${s.note}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
