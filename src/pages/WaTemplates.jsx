import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade } from '../components/ui'
import {
  WA_TEMPLATE_CATALOG,
  invoiceReminder,
  jobUpdate,
  readyForCollection,
  quoteFollowUp,
  paymentThanks,
  portalShare,
} from '../lib/waTemplates'
import { openWhatsApp } from '../lib/share'

const BUILDERS = {
  invoiceReminder,
  jobUpdate,
  readyForCollection,
  quoteFollowUp,
  paymentThanks,
  portalShare,
}

export default function WaTemplates() {
  const { invoices, clients, tickets, quotes, company, toast } = useApp()
  const [pick, setPick] = useState('invoice_reminder')
  const [preview, setPreview] = useState('')

  const run = () => {
    const meta = WA_TEMPLATE_CATALOG.find((t) => t.id === pick)
    const fn = BUILDERS[meta?.build]
    if (!fn) return toast?.('Template not available', 'info')
    const client = clients[0]
    const inv = invoices.find((i) => ['unpaid', 'overdue', 'partial'].includes(i.status)) || invoices[0]
    const ticket = tickets[0]
    const quote = quotes[0]
    let text = ''
    try {
      if (meta.build === 'invoiceReminder') text = fn(inv || {}, client || {}, company)
      else if (meta.build === 'jobUpdate' || meta.build === 'readyForCollection') text = fn(ticket || {}, client || {}, company)
      else if (meta.build === 'quoteFollowUp') text = fn(quote || {}, client || {}, company)
      else if (meta.build === 'paymentThanks') text = fn(inv || {}, client || {}, company, inv?.amountPaid)
      else if (meta.build === 'portalShare') text = fn(client || {}, company, 'https://portal.example')
      else text = fn(inv || {}, client || {}, company)
    } catch (e) {
      text = String(e.message || e)
    }
    setPreview(text)
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp templates</h1>
          <p className="subtitle">SA IT desk phrases — preview then send</p>
        </div>
      </div>
      <div className="card form-grid">
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Template</span>
          <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            {WA_TEMPLATE_CATALOG.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={run}>Preview</button>
        {preview ? (
          <>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0 }}>{preview}</pre>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                openWhatsApp(clients[0]?.phone || '', preview)
                toast?.('Opening WhatsApp…', 'success')
              }}
            >
              Open WhatsApp
            </button>
          </>
        ) : null}
      </div>
    </PageFade>
  )
}
