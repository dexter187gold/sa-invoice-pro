import React, { useEffect } from 'react'

/** Generic modal / popup. Prefer for create-edit flows; keep full pages for dense work. */
export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  size = 'md',
  wide,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const maxW = wide || size === 'lg' ? 'min(720px, 100%)' : size === 'sm' ? 'min(380px, 100%)' : 'min(520px, 100%)'
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div
        className="modal-card modal-card-scroll"
        style={{ width: maxW, maxHeight: 'min(90vh, 900px)', display: 'flex', flexDirection: 'column', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border, #334155)' }}>
          <h3 id="modal-title" style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: '14px 16px', overflow: 'auto', flex: 1 }}>{children}</div>
        {footer ? (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border, #334155)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { Modal }
