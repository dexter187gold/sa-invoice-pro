import React, { useState } from 'react'
import { Sync } from '../lib/sync'
import { openWhatsApp, openEmail } from '../lib/share'
import { readMediaBlob } from '../lib/mediaOpfs'

function blobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read selected attachment'))
    reader.readAsDataURL(blob)
  })
}

export default function PortalCard({
  client,
  company,
  invoices = [],
  tickets = [],
  toast,
  onCreated,
  preparePortal,
  compact = false,
}) {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState(null)
  const [login, setLogin] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState({})
  const [publishing, setPublishing] = useState(false)

  if (!client) return null

  const openBal = invoices
    .filter((i) => String(i.clientId) === String(client.id) && ['unpaid', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amountDue ?? i.total) || 0), 0)

  function loginOrLinkText(data, issued, email) {
    const url = issued?.url || data?.url || ''
    const pin = issued?.pin || issued?.account?.pin || issued?.temporaryPin
    const user = issued?.username || issued?.email || email
    if (pin && user) {
      return `Client portal login\nURL: ${url}\nUsername / email: ${user}\nPIN: ${pin}\n(Keep this PIN private — shown once.)`
    }
    return url
  }

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
      let issued = null
      const email = String(client.email || '').trim().toLowerCase()
      if (email.includes('@') && Sync.issueClientPortalLogin) {
        try {
          issued = await Sync.issueClientPortalLogin({
            clientId: client.id,
            email,
            name: client.name || email,
            phone: client.phone || '',
          })
          const pin = issued?.pin || issued?.account?.pin || issued?.temporaryPin
          const user = issued?.username || issued?.email || email
          if (pin) setLogin({ username: user, email, pin, portalUrl: issued?.url || data?.url })
        } catch (e) {
          console.warn('[PortalCard] issue login', e?.message || e)
        }
      }
      try {
        await navigator.clipboard.writeText(loginOrLinkText(data, issued, email))
        const pin = issued?.pin || issued?.account?.pin || issued?.temporaryPin
        toast?.(pin ? 'Portal link + login PIN copied' : 'Portal link copied', 'success')
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
  const customerJobs = (tickets || []).filter((t) => String(t.clientId) === String(client.id))
  const availableFiles = customerJobs.flatMap((ticket) => [
    ...(Array.isArray(ticket.photos) ? ticket.photos : []),
    ...(Array.isArray(ticket.attachments) ? ticket.attachments : []),
  ].map((file) => ({ ...file, ticketId: ticket.id, ticketLabel: ticket.number || ticket.title || 'Job card' })))
  const selectedCount = availableFiles.filter((file) => selectedFiles[String(file.id)]).length

  const publishSelected = async () => {
    if (!link?.token || !selectedCount) return
    setPublishing(true)
    try {
      const chosen = availableFiles.filter((file) => selectedFiles[String(file.id)])
      const payload = []
      for (const file of chosen) {
        let dataUrl = file.dataUrl || ''
        if (!dataUrl && file.opfs && file.path) {
          const blob = await readMediaBlob(file.path)
          if (!blob) throw new Error('Could not find ' + (file.name || 'a selected file') + ' in this device storage')
          dataUrl = await blobAsDataUrl(blob)
        }
        if (!dataUrl) throw new Error((file.name || 'Selected file') + ' is not available to upload')
        payload.push({ id: file.id, ticketId: file.ticketId, name: file.name, dataUrl })
      }
      const result = await Sync.publishPortalAttachments(link.token, payload)
      toast?.((result.published || payload.length) + ' file(s) shared with customer', 'success')
      setSelectedFiles({})
    } catch (e) {
      toast?.(e?.message || 'Could not share attachments', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const shareText = login
    ? `Hi ${client.name?.split(' ')[0] || 'there'}, your client portal for ${company?.name || 'us'}:\n${login.portalUrl || url}\nLogin: ${login.username}\nPIN: ${login.pin}`
    : `Hi ${client.name?.split(' ')[0] || 'there'}, ` +
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
          {login?.pin ? (
            <div className="card" style={{ marginTop: 8, padding: 10, border: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 13 }}>Customer login (show once)</strong>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0' }}>
                Username / email: <code>{login.username}</code>
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, margin: '4px 0' }}>{login.pin}</p>
              <p className="muted" style={{ fontSize: 11, margin: 0 }}>
                Share via WhatsApp or a trusted channel. Reset PIN anytime under Portal admin.
              </p>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Tip: add a client email, then create the link again to issue a username + PIN login.
            </p>
          )}
          {availableFiles.length > 0 && (
            <div className="card" style={{ marginTop: 12, padding: 12 }}>
              <strong>Job-card attachments</strong>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>
                Choose exactly which files the customer may download. Files stay private until you share them here.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {availableFiles.map((file) => (
                  <label key={String(file.ticketId) + ':' + String(file.id)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <input type="checkbox" checked={!!selectedFiles[String(file.id)]} onChange={(e) => setSelectedFiles((prev) => ({ ...prev, [String(file.id)]: e.target.checked }))} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{file.name || 'Attachment'}</strong>
                      <span className="muted" style={{ fontSize: 11 }}>{file.ticketLabel} · {file.size ? Math.ceil(file.size / 1024) + ' KB' : 'File size unknown'}{file.opfs ? ' · stored on this device' : ''}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} disabled={!selectedCount || publishing} onClick={publishSelected}>
                {publishing ? 'Sharing files…' : 'Share ' + (selectedCount || '') + ' selected file' + (selectedCount === 1 ? '' : 's') + ' with customer'}
              </button>
            </div>
          )}
          <div className="portal-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    login?.pin
                      ? `URL: ${url}\nLogin: ${login.username}\nPIN: ${login.pin}`
                      : url,
                  )
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
          Client opens the link without installing the app — sees invoices & balance. With an email on the client we also issue a PIN login.
        </p>
      )}
    </div>
  )
}
