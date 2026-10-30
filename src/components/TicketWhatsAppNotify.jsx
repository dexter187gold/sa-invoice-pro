import React, { useState } from 'react'
import { notifyJobStatus, getWhatsAppConfigStatus } from '../lib/waBusiness'

/** Cloud API job-status notify with wa.me fallback (P7). */
export default function TicketWhatsAppNotify({ ticket, client, company, toast }) {
  const [busy, setBusy] = useState(false)
  const phone = client?.phone || client?.mobile || ticket?.contactPhone || ticket?.clientPhone
  if (!phone) return null

  const send = async () => {
    setBusy(true)
    try {
      await getWhatsAppConfigStatus()
      const r = await notifyJobStatus({
        job: ticket,
        client: client || { phone, name: ticket?.clientName },
        company,
        status: ticket?.status,
      })
      toast?.(
        r.channel === 'cloud'
          ? 'WhatsApp sent via Cloud API'
          : 'Opened WhatsApp (add Meta token in Dev portal for automatic send)',
        r.channel === 'cloud' ? 'success' : 'info',
      )
    } catch (e) {
      toast?.(e?.message || 'WhatsApp send failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={send} title="Notify client on WhatsApp">
      {busy ? 'Sending…' : 'WA notify'}
    </button>
  )
}
