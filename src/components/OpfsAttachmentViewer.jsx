import React, { useEffect, useState } from 'react'
import { listAttachments, listTicketPhotos } from '../lib/attachments'
import { mediaObjectUrl, mediaOpfsAvailable } from '../lib/mediaOpfs'

/** Renders photo thumbs + document links; OPFS-backed docs open via object URL. */
export default function OpfsAttachmentViewer({ record, docsKey = 'attachments' }) {
  const photos = listTicketPhotos(record)
  const docs = listAttachments(record, docsKey)
  const [urls, setUrls] = useState({})
  const [opfs, setOpfs] = useState(false)

  useEffect(() => {
    mediaOpfsAvailable().then(setOpfs).catch(() => setOpfs(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    const next = {}
    const load = async () => {
      for (const d of docs) {
        if (d?.opfs && d.path) {
          try {
            const u = await mediaObjectUrl(d.path)
            if (u && !cancelled) next[d.id] = u
          } catch {}
        }
      }
      if (!cancelled) {
        setUrls((prev) => {
          Object.values(prev).forEach((u) => {
            try {
              URL.revokeObjectURL(u)
            } catch {}
          })
          return next
        })
      }
    }
    load()
    return () => {
      cancelled = true
      Object.values(next).forEach((u) => {
        try {
          URL.revokeObjectURL(u)
        } catch {}
      })
    }
  }, [docs.map((d) => d.id).join('|')])

  if (!photos.length && !docs.length) {
    return <p className="muted" style={{ fontSize: 12 }}>No attachments yet.</p>
  }

  return (
    <div className="form-grid" style={{ gap: 8 }}>
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {photos.map((p) => (
            <a key={p.id} href={p.dataUrl || p.url || '#'} target="_blank" rel="noopener noreferrer">
              <img
                src={p.dataUrl || p.url}
                alt={p.name || 'photo'}
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }}
              />
            </a>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {docs.map((d) => {
            const href = d.dataUrl || urls[d.id] || null
            return (
              <li key={d.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" download={d.name}>
                    {d.name || 'document'}
                  </a>
                ) : (
                  <span>
                    {d.name || 'document'}
                    {d.opfs ? ' (on device storage)' : ''}
                  </span>
                )}
                {d.size ? <span className="muted"> · {(d.size / 1024).toFixed(0)} KB</span> : null}
              </li>
            )
          })}
        </ul>
      )}
      {opfs ? (
        <p className="muted" style={{ fontSize: 11 }}>Large files use private device storage (OPFS).</p>
      ) : null}
    </div>
  )
}
