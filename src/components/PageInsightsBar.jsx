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
  productPageInsights,
  employeePageInsights,
  payrollPageInsights,
  bankPageInsights,
  reportPageInsights,
  recurringPageInsights,
  documentPageInsights,
} from '../lib/pageInsights'

const BUILDERS = {
  invoices: invoicePageInsights,
  quotes: quotePageInsights,
  clients: clientPageInsights,
  tickets: ticketPageInsights,
  payments: paymentPageInsights,
  expenses: expensePageInsights,
  products: productPageInsights,
  employees: employeePageInsights,
  payroll: payrollPageInsights,
  bank: bankPageInsights,
  reports: reportPageInsights,
  recurring: recurringPageInsights,
  documents: documentPageInsights,
}

/**
 * Compact owner radar for list pages.
 * @param {'invoices'|'quotes'|'clients'|'tickets'|'payments'|'expenses'|'products'|'employees'|'payroll'|'bank'|'reports'|'recurring'|'documents'} page
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
      products: ctx.products || [],
      services: ctx.services || [],
      employees: ctx.employees || [],
      ...extra,
    })
  }, [page, ctx.invoices, ctx.quotes, ctx.clients, ctx.tickets, ctx.payments, ctx.expenses, ctx.products, ctx.services, ctx.employees, extra])

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
              }}
            >
              <div className="muted" style={{ fontSize: 11 }}>{it.label}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color, marginTop: 2 }}>{display}</div>
              {it.hint ? <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{it.hint}</div> : null}
            </div>
          )
          return it.href ? (
            <Link key={it.label} to={it.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {inner}
            </Link>
          ) : (
            <div key={it.label}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
