import React from 'react'

export default function CompanyLogoField({ form, setForm }) {
  return (
    <div className="form-grid" style={{ marginBottom: 12 }}>
      <h4 style={{ margin: '0 0 8px' }}>Company logo</h4>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>Shown on tax invoice PDFs. PNG/JPEG under ~500 KB.</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {form?.logoDataUrl ? (
          <img src={form.logoDataUrl} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, background: '#0f172a' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--border,#334155)' }} />
        )}
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          Upload logo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 600000) {
                alert('Logo too large — keep under ~500 KB')
                e.target.value = ''
                return
              }
              const reader = new FileReader()
              reader.onload = () => setForm((f) => ({ ...f, logoDataUrl: String(reader.result || ''), logoName: file.name }))
              reader.readAsDataURL(file)
              e.target.value = ''
            }}
          />
        </label>
        {form?.logoDataUrl ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, logoDataUrl: '', logoName: '' }))}>Remove</button>
        ) : null}
      </div>
    </div>
  )
}
