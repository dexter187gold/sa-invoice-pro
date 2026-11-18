import React from 'react'
import { addImageAttachments, addDocumentAttachments, listAttachments, listTicketPhotos } from '../lib/attachments'

export default function InvoiceAttachmentsPanel({ form, setForm, toast }) {
  if (!form) return null
  return (
    <div className="card form-grid" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Attachments</h3>
      <p className="muted" style={{ fontSize: 12 }}>Photos and documents on this invoice (stored on this device).</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          Photos
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              try {
                const next = await addImageAttachments(form, e.target.files, { key: 'photos' })
                setForm(next)
                toast?.('Photos attached', 'success')
              } catch (err) {
                toast?.(err?.message || 'Failed', 'error')
              }
              e.target.value = ''
            }}
          />
        </label>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          Documents
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf"
            multiple
            hidden
            onChange={async (e) => {
              try {
                const next = await addDocumentAttachments(form, e.target.files, { key: 'attachments' })
                setForm(next)
                toast?.('Documents attached', 'success')
              } catch (err) {
                toast?.(err?.message || 'Failed', 'error')
              }
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {listTicketPhotos(form).map((p) => (
          <img key={p.id} src={p.dataUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
        ))}
        {listAttachments(form).map((d) => (
          <span key={d.id} className="muted" style={{ fontSize: 12 }}>{d.name}</span>
        ))}
      </div>
    </div>
  )
}
