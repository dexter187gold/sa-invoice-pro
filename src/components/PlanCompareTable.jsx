import React from 'react'
import {
  comparisonColumns,
  COMPARISON_ROWS,
  cellValue,
  normalizePlanId,
} from '../lib/licenseTiers'

/**
 * Responsive plan comparison table (trial + purchasable plans).
 */
export default function PlanCompareTable({
  currentPlan = '',
  includeTrial = true,
  highlightRecommended = true,
}) {
  const cols = comparisonColumns(includeTrial)
  const current = normalizePlanId(currentPlan)

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Compare plans</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Same catalogue as the licence server (T · S · P · M · L · E). Features unlock by plan group.
      </p>
      <table
        className="plan-compare-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          minWidth: 640,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '10px 8px',
                borderBottom: '1px solid var(--border, rgba(255,255,255,.12))',
                position: 'sticky',
                left: 0,
                background: 'var(--card-bg, var(--bg-elevated, #1a1a1a))',
                zIndex: 1,
              }}
            >
              Feature
            </th>
            {cols.map((t) => {
              const active = current === t.id
              const rec = highlightRecommended && t.recommended
              return (
                <th
                  key={t.id}
                  style={{
                    textAlign: 'center',
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border, rgba(255,255,255,.12))',
                    background: active || rec
                      ? 'rgba(34,197,94,.12)'
                      : 'transparent',
                    minWidth: 88,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 10, fontWeight: 500 }}>
                    {t.code}
                    {active ? ' · active' : ''}
                    {rec && !active ? ' · popular' : ''}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.id}>
              <td
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--border, rgba(255,255,255,.08))',
                  position: 'sticky',
                  left: 0,
                  background: 'var(--card-bg, var(--bg-elevated, #1a1a1a))',
                  fontWeight: 500,
                }}
              >
                {row.label}
              </td>
              {cols.map((t) => {
                const v = cellValue(row, t.id)
                const active = current === t.id
                return (
                  <td
                    key={t.id}
                    style={{
                      textAlign: 'center',
                      padding: '8px',
                      borderBottom: '1px solid var(--border, rgba(255,255,255,.08))',
                      background: active ? 'rgba(34,197,94,.08)' : 'transparent',
                      color:
                        v === 'yes'
                          ? 'var(--green, #22c55e)'
                          : v === 'no'
                            ? 'var(--muted, #888)'
                            : 'inherit',
                      fontWeight: v === 'yes' || (v !== 'no' && v !== '—') ? 600 : 400,
                    }}
                  >
                    {v === 'yes' ? '✓' : v === 'no' ? '—' : v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
