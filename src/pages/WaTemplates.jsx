import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageFade } from '../components/ui'
import { openWhatsApp } from '../lib/share'
import {
  getWhatsAppConfig,
  hasCloudCredentials,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  META_TEMPLATE_MAP,
} from '../lib/whatsapp'
import {
  buildInvoiceReminder,
  buildJobUpdate,
  buildReadyForCollection,
  buildQuoteFollowUp,
  buildPaymentThanks,
  buildPortalShare,
} from '../lib/chasePack'

const FREEFORM = [
  { id: 'invoiceReminder', label: 'Invoice reminder (free-form)', build: 'invoiceReminder' },
  { id: 'jobUpdate', label: 'Job status (free-form)', build: 'jobUpdate' },
  { id: 'readyForCollection', label: 'Ready for collection', build: 'readyForCollection' },
  { id: 'quoteFollowUp', label: 'Quote follow-up', build: 'quoteFollowUp' },
  { id: 'paymentThanks', label: 'Payment thank-you', build: 'paymentThanks' },
  { id: 'portalShare', label: 'Portal link share', build: 'portalShare' },
]

const BUILDERS = {
  invoiceReminder: buildInvoiceReminder,
  jobUpdate: buildJobUpdate,
  readyForCollection: buildReadyForCollection,
  quoteFollowUp: buildQuoteFollowUp,
  paymentThanks: buildPaymentThanks,
  portalShare: buildPortalShare,
}

export default function WaTemplates() {
  const { toast, clients = [], invoices = [], tickets = [], quotes = [], company } = useApp()
  const [pick, setPick] = useState(FREEFORM[0].id)
  const [metaPick, setMetaPick] = useState('hello_world')
  const [preview, setPreview] = useState('')
  const [cloud, setCloud] = useState(null)
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState('')

  React.useEffect(() => {
    hasCloudCredentials().then((ok) => setCloud(!!ok)).catch(() => setCloud(false))
    if (!phone && clients[0]?.phone) setPhone(clients[0].phone)
  }, [clients])

  const metaRow = useMemo(
    () => META_TEMPLATE_MAP.find((t) => t.id === metaPick) || META_TEMPLATE_MAP[0],
    [metaPick],
  )

  const runFreeform = () => {
    const meta = FREEFORM.find((t) => t.id === pick)
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
      else if (meta.build === 'paymentThanks') text = fn(inv || {}, client || {}, company)
      else if (meta.build === 'portalShare') text = fn(client || {}, company, 'https://sa-invoice-pro-client-portal.pages.dev')
      else text = fn(inv || {}, client || {}, company)
    } catch (e) {
      text = String(e.message || e)
    }
    setPreview(text)
  }

  const sendFreeform = async () => {
    if (!preview) return toast('Preview a template first', 'info')
    const to = phone || clients[0]?.phone
    if (!to) return toast('Enter a phone number', 'error')
    setBusy(true)
    try {
      const r = await sendWhatsAppText(to, preview)
      toast(
        r.mode === 'cloud' ? 'Sent via WhatsApp Cloud API' : 'Opened WhatsApp — tap Send',
        r.mode === 'cloud' ? 'success' : 'info',
      )
    } catch (e) {
      toast(e?.message || 'Send failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const sendMeta = async () => {
    const to = phone || clients[0]?.phone
    if (!to) return toast('Enter a phone number', 'error')
    if (!metaRow) return
    setBusy(true)
    try {
      const client = clients[0] || {}
      const inv = invoices[0] || {}
      const ticket = tickets[0] || {}
      const paramsById = {
        job_status_update: [
          client.name || 'Customer',
          ticket.title || ticket.subject || 'Job',
          ticket.status || 'in progress',
          company?.name || 'SA Invoice Pro',
        ],
        invoice_reminder: [
          client.name || 'Customer',
          inv.number || 'INV',
          String(inv.total ?? inv.amountDue ?? ''),
          company?.name || 'SA Invoice Pro',
        ],
        appointment_update: [
          client.name || 'Customer',
          ticket.title || 'Your appointment',
          company?.name || 'SA Invoice Pro',
        ],
        hello_world: [],
      }
      const bodyParams = paramsById[metaRow.id] || []
      const r = await sendWhatsAppTemplate(to, metaRow.metaName, bodyParams, {
        language: metaRow.language || 'en',
        fallbackText: preview || bodyParams.join(' · '),
      })
      toast(
        r.mode === 'cloud-template'
          ? `Meta template “${metaRow.metaName}” sent`
          : r.note || 'Opened WhatsApp fallback',
        r.mode === 'cloud-template' ? 'success' : 'info',
      )
    } catch (e) {
      toast(e?.message || 'Template send failed — check name matches Meta exactly', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFade>
      <div className="page-header">
        <div>
          <h1>WhatsApp templates</h1>
          <p className="subtitle">
            Free-form desk phrases · Meta-approved templates for outside the 24-hour window
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 14 }}>
        <strong>Status</strong>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>
          Cloud API: {cloud == null ? '…' : cloud ? 'credentials detected' : 'not configured — using wa.me until token is set'}
        </p>
        <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
          Meta emails saying a template is <strong>Approved</strong> mean you can send that template
          name via Cloud API. Free-form text only works inside a 24-hour customer-care window
          (after the customer messaged you). Outside that window you must use an approved template.
        </p>
      </div>

      <div className="card form-grid" style={{ marginBottom: 12 }}>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Send to (phone)</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082… or 2782…"
          />
        </label>
      </div>

      <div className="card form-grid" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>1. Free-form (desk phrases)</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Best for replies while the chat is open. Opens wa.me or Cloud text if configured.
        </p>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Template</span>
          <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            {FREEFORM.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={runFreeform}>Preview</button>
          <button type="button" className="btn btn-outline" disabled={busy || !preview} onClick={sendFreeform}>
            Send free-form
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!preview}
            onClick={() => {
              openWhatsApp(phone || clients[0]?.phone || '', preview)
              toast?.('Opening WhatsApp…', 'success')
            }}
          >
            Open wa.me
          </button>
        </div>
        {preview ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0, background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
            {preview}
          </pre>
        ) : null}
      </div>

      <div className="card form-grid">
        <h3 style={{ margin: 0 }}>2. Meta-approved templates</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Use the <strong>exact template name</strong> from your approval email / Meta Business Manager.
          Update <code>META_TEMPLATE_MAP</code> if your approved names differ.
        </p>
        <label className="stack" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Mapped template</span>
          <select className="input" value={metaPick} onChange={(e) => setMetaPick(e.target.value)}>
            {META_TEMPLATE_MAP.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} · {t.metaName} ({t.category})
              </option>
            ))}
          </select>
        </label>
        {metaRow ? (
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            When: {metaRow.when}<br />
            Graph name: <code>{metaRow.metaName}</code> · lang <code>{metaRow.language}</code>
            {metaRow.bodyParams?.length ? <> · variables: {metaRow.bodyParams.join(', ')}</> : null}
          </p>
        ) : null}
        <button type="button" className="btn btn-primary" disabled={busy} onClick={sendMeta}>
          {busy ? 'Sending…' : 'Send Meta template'}
        </button>
      </div>
    </PageFade>
  )
}
