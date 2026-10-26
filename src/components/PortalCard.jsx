import React, { useState } from 'react'
import { Sync } from '../lib/sync'
import { openWhatsApp, openEmail } from '../lib/share'

export default function PortalCard({
  client,
  company,
  invoices = [],
  toast,
  onCreated,
  preparePortal,
  compact = false,
}) {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState(null)

  if (!client) return null

  const openBal = invoices
    .filter((i) => String(i.clientId) === String(client.id) && ['unpaid', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)

  const create = async () => {
    if (!Sync.isLoggedIn()) {
      toast?.('Sign in to cloud under Settings first', 'error')
      return
    }
    setBusy(true)
    try {
      const data = preparePortal ? await preparePortal(client) : await Sync.createPortalLink(client.id, { days: 90 })
      setLink(data)
      onCreated?.(data)
      try {
        await navigator.clipboard.writeText(data.url)
        toast?.('Portal link copied', 'success')
      } catch {
        toast?.('Portal link ready', 'success')
      }
    } catch (e) {
      toast?.(e?.message || 'Portal failed — push workspace once from Settings', 'error')
    } finally {
      setBusy(false)
    }
  }

  const url = link?.url
  const shareText =
    `Hi ${client.name?.split(' ')[0] || 'there'}, ` +
    `view your invoices online for ${company?.name || 'us'}: ${url || ''}` +
    (openBal ? ` Open balance on file.` : '')

  return (
    <div className={`portal-card ${compact ? 'compact' : ''}`}>
      <div className="portal-card-top">
        <div>
          <div className="portal-kicker">Client portal</div>
          <strong>{client.name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            Secure link · 90 days · {openBal > 0 ? 'AR on file' : 'Statements & invoices'}
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={create}>
          {busy ? 'Creating…' : url ? 'Refresh link' : 'Create portal link'}
        </button>
      </div>
      {url ? (
        <div className="portal-card-body">
          <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="portal-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  toast?.('Copied', 'success')
                } catch {
                  toast?.('Copy manually', 'info')
                }
              }}
            >
              Copy
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                const ok = openWhatsApp(client.phone, shareText)
                toast?.(ok ? 'WhatsApp…' : 'Add phone on client', ok ? 'success' : 'info')
              }}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                const ok = openEmail(
                  client.email,
                  `Your invoices — ${company?.name || 'SA Invoice Pro'}`,
                  shareText,
                )
                toast?.(ok ? 'Email…' : 'Add email on client', ok ? 'success' : 'info')
              }}
            >
              Email
            </button>
            <a className="btn btn-outline btn-sm" href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
          Client opens the link without installing the app — sees invoices & balance. Fewer “please resend PDF” calls.
        </p>
      )}
    </div>
  )
}
