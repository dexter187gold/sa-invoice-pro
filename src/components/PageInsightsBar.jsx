import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/money'
import {
  invoicePageInsights,
  quotePageInsights,
  clientPageInsights,
  ticketPageInsights,
  paymentPageInsights,
  expensePageInsights,
} from '../lib/pageInsights'

const BUILDERS = {
  invoices: invoicePageInsights,
  quotes: quotePageInsights,
  clients: clientPageInsights,
  tickets: ticketPageInsights,
  payments: paymentPageInsights,
  expenses: expensePageInsights,
}

/**
 * Compact owner radar for list pages.
 * @param {'invoices'|'quotes'|'clients'|'tickets'|'payments'|'expenses'} page
 */
export default function PageInsightsBar({ page, extra }) {
  const ctx = useApp()
  const data = useMemo(() => {
    const fn = BUILDERS[page]
    if (!fn) return { items: [], tip: '' }
    return fn({
      invoices: ctx.invoices || [],
      quotes: ctx.quotes || [],
      clients: ctx.clients || [],
      tickets: ctx.tickets || [],
      payments: ctx.payments || [],
      expenses: ctx.expenses || [],
      ...extra,
    })
  }, [page, ctx.invoices, ctx.quotes, ctx.clients, ctx.tickets, ctx.payments, ctx.expenses, extra])

  if (!data.items?.length) return null

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: '12px 14px',
        borderLeft: '4px solid var(--green, #0f766e)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>Owner radar</strong>
        {data.tip ? <span className="muted" style={{ fontSize: 12, maxWidth: 520 }}>{data.tip}</span> : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))',
          gap: 8,
          marginTop: 10,
        }}
      >
        {data.items.map((it) => {
          const display = it.money ? formatMoney(it.value) : String(it.value)
          const color =
            it.tone === 'good'
              ? 'var(--green, #059669)'
              : it.tone === 'bad'
                ? '#b91c1c'
                : it.tone === 'warn'
                  ? '#b45309'
                  : 'inherit'
          const inner = (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid var(--border, #334155)',
                background: 'var(--bg, transparent)',
                minHeight: 56,
              }}
            >
              <div className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {it.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color, marginTop: 2 }}>{display}</div>
              {it.hint ? <div className="muted" style={{ fontSize: 10 }}>{it.hint}</div> : null}
            </div>
          )
          if (it.href) {
            return (
              <Link key={it.label} to={it.href.startsWith('/') ? it.href : `.${it.href}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {inner}
              </Link>
            )
          }
          return <div key={it.label}>{inner}</div>
        })}
      </div>
    </div>
  )
}
