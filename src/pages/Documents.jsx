import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { APP_NAME, APP_VERSION } from '../config'
import { loadJsPdf } from '../lib/loadJsPdf'
import { openJsPdf, downloadJsPdf } from '../lib/pdfOpen'
import { IT_DOCUMENT_TEMPLATES, searchITDocumentTemplates, getITDocumentTemplate } from '../lib/itDocumentTemplates'

const GREEN = [0, 122, 77]
const SLATE = [30, 41, 59]
const MUTED = [100, 116, 139]
const CATEGORIES = ['all', ...new Set(IT_DOCUMENT_TEMPLATES.map((item) => item.category))]

function safeText(value, fallback = 'To be completed') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export default function Documents() {
  const { clients = [], company, toast } = useApp()
  const [type, setType] = useState('it_assessment')
  const [clientId, setClientId] = useState('')
  const [docRef, setDocRef] = useState(() => 'IT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5))
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [busy, setBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const selected = getITDocumentTemplate(type)
  const client = clients.find((c) => String(c.id) === String(clientId)) || { name: 'Client / business owner' }
  const filtered = useMemo(() => searchITDocumentTemplates(search, category), [search, category])
  const fillDemo = () => {
    if (clients[0]) setClientId(String(clients[0].id))
    setNotes('Business priority: improve service reliability, reduce operational risk and document ownership. Confirm scope, system inventory, stakeholders, assumptions and acceptance evidence before approval.')
    setDocRef('IT-DEMO-' + new Date().getFullYear())
    toast?.('Example details added — review and replace before issuing.', 'success')
  }

  const buildPdf = async () => {
    const co = company || {}
    const template = getITDocumentTemplate(type)
    const jsPDF = await loadJsPdf()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const left = 17
    const right = 17
    const width = pageW - left - right
    let y = 18
    let pageNo = 1

    const addPage = () => {
      doc.addPage()
      pageNo += 1
      y = 19
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...GREEN)
      doc.text(String(co.name || APP_NAME).toUpperCase(), left, 12)
      doc.setDrawColor(220, 228, 232)
      doc.line(left, 15, pageW - right, 15)
    }
    const ensureSpace = (height) => {
      if (y + height > pageH - 22) addPage()
    }
    const drawWrapped = (text, size, lineHeight, font = 'normal', color = SLATE, gapAfter = 2) => {
      doc.setFont('helvetica', font)
      doc.setFontSize(size)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(String(text), width)
      const height = lines.length * lineHeight
      ensureSpace(height + gapAfter)
      doc.text(lines, left, y)
      y += height + gapAfter
    }
    const drawSection = (heading, body) => {
      const lines = doc.splitTextToSize(String(body), width)
      const estimated = 5.5 + Math.min(lines.length, 2) * 4 + 5
      ensureSpace(estimated)
      doc.setFillColor(235, 247, 241)
      doc.roundedRect(left - 1, y - 3.5, width + 2, 7, 1.2, 1.2, 'F')
      drawWrapped(heading, 10, 4.5, 'bold', GREEN, 2)
      drawWrapped(body, 9.2, 4.6, 'normal', SLATE, 5)
    }

    // Branded cover/metadata header.
    doc.setFillColor(8, 48, 37)
    doc.rect(0, 0, pageW, 42, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(String(co.name || APP_NAME).toUpperCase(), left, 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const contact = [co.address, co.phone, co.email, co.vatNumber ? 'VAT ' + co.vatNumber : ''].filter(Boolean).join('  •  ')
    if (contact) doc.text(doc.splitTextToSize(contact, width), left, 22)
    doc.setDrawColor(65, 130, 102)
    doc.line(left, 28, pageW - right, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(template.title.toUpperCase(), left, 36)
    y = 51

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const metaRows = [
      ['Document reference', safeText(docRef)],
      ['Prepared for', safeText(client.name, 'Client / business owner')],
      ['Prepared by', safeText(co.name, APP_NAME)],
      ['Issue date', new Date().toLocaleDateString('en-ZA')],
      ['Document owner', '[Name / role to be completed]'],
      ['Version / review date', 'v1.0 · [review date to be completed]'],
      ['Status', 'DRAFT — review, complete placeholders and approve before use'],
    ]
    const colW = width / 2
    metaRows.forEach(([label, value], index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = left + col * colW
      const yy = y + row * 13
      doc.setFillColor(row % 2 ? 249 : 244, row % 2 ? 251 : 248, row % 2 ? 250 : 247)
      doc.roundedRect(x, yy - 4.5, colW - 2, 11, 1.2, 1.2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...MUTED)
      doc.text(label.toUpperCase(), x + 3, yy - 0.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.setTextColor(...SLATE)
      doc.text(doc.splitTextToSize(value, colW - 8).slice(0, 2), x + 3, yy + 3.5)
    })
    y += Math.ceil(metaRows.length / 2) * 13 + 4
    drawWrapped('DOCUMENT PURPOSE', 9, 4.5, 'bold', GREEN, 2)
    drawWrapped(template.purpose, 9.5, 4.8, 'normal', SLATE, 4)
    drawWrapped('SCOPE SUMMARY', 9, 4.5, 'bold', GREEN, 2)
    drawWrapped(template.scope, 9.5, 4.8, 'normal', SLATE, 6)

    for (const section of template.sections) drawSection(section.heading, section.body)
    if (notes.trim()) drawSection('12. Business-specific instructions and additional clauses', notes.trim())

    ensureSpace(36)
    drawWrapped('APPROVAL RECORD', 10, 4.5, 'bold', GREEN, 4)
    const signY = y
    doc.setDrawColor(...MUTED)
    doc.setLineWidth(0.25)
    doc.line(left, signY + 12, left + 72, signY + 12)
    doc.line(left + 92, signY + 12, pageW - right, signY + 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('Prepared / reviewed by · name, role, date', left, signY + 17)
    doc.text('Approved by · name, role, date', left + 92, signY + 17)
    y = signY + 23
    drawWrapped('Important: This is an editable operational template, not a legal opinion or a guarantee of compliance. Verify facts, adapt it to the actual environment and have an appropriately qualified adviser review legal, regulatory, contractual or high-risk security decisions before relying on it.', 7.5, 3.8, 'italic', MUTED, 2)

    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i)
      doc.setDrawColor(220, 228, 232)
      doc.line(left, pageH - 15, pageW - right, pageH - 15)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...MUTED)
      doc.text(String(co.name || APP_NAME) + ' · IT Document Studio · v' + APP_VERSION, left, pageH - 9)
      doc.text('Confidential business record · ' + i + ' / ' + totalPages, pageW - right, pageH - 9, { align: 'right' })
    }
    return doc
  }

  const generate = async (open = false) => {
    if (busy) return
    setBusy(true)
    try {
      const doc = await buildPdf()
      const name = (docRef || 'it-document').replace(/[^\w.-]+/g, '_') + '.pdf'
      if (open) {
        await openJsPdf(doc, name)
        toast?.('Document preview ready.', 'success')
      } else {
        await downloadJsPdf(doc, name)
        toast?.('Detailed PDF generated. Review it before sending.', 'success')
      }
    } catch (err) {
      console.error(err)
      toast?.(err?.message || String(err) || 'PDF generation failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="it-doc-studio">
      <div className="page-header">
        <div>
          <p className="it-doc-eyebrow">SA INVOICE PRO · IT BUSINESS TOOLKIT</p>
          <h1>Document Studio</h1>
          <p className="subtitle">A professional IT document library for service providers, consultants, repair shops, MSPs and internal IT teams.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fillDemo}>Load example</button>
      </div>

      <div className="it-doc-hero">
        <div>
          <span className="it-doc-hero-kicker">IT MODULE · TEMPLATE LIBRARY</span>
          <h2>Build documents that are ready for real business workflows.</h2>
          <p>Choose a specialist template, tailor it to your company and client, then generate a branded, multi-page A4 PDF with ownership, controls, acceptance and sign-off sections.</p>
          <div className="it-doc-hero-stats">
            <span><strong>{IT_DOCUMENT_TEMPLATES.length}</strong> IT templates</span>
            <span><strong>11</strong> structured sections</span>
            <span><strong>A4</strong> print-ready output</span>
          </div>
        </div>
        <div className="it-doc-hero-mark" aria-hidden="true"><span>IT</span><i>DOCS</i></div>
      </div>

      <div className="it-doc-layout">
        <section className="it-doc-library">
          <div className="it-doc-section-head">
            <div><h2>Template library</h2><p>Search by task, category or document name.</p></div>
            <span className="it-doc-count">{filtered.length} shown</span>
          </div>
          <div className="it-doc-search-row">
            <input className="input" aria-label="Search templates" placeholder="Search security, network, support, POPIA…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.filter((item) => item !== 'all').map((item) => <option key={item} value={item}>{IT_DOCUMENT_TEMPLATES.find((t) => t.category === item)?.categoryLabel || item}</option>)}
            </select>
          </div>
          <div className="it-doc-template-grid">
            {filtered.map((item, index) => (
              <button key={item.id} type="button" className={'it-doc-template' + (item.id === type ? ' selected' : '')} onClick={() => setType(item.id)} aria-pressed={item.id === type}>
                <span className="it-doc-template-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="it-doc-template-category">{item.categoryLabel}</span>
                <strong>{item.title}</strong>
                <span className="it-doc-template-purpose">{item.purpose}</span>
                <span className="it-doc-template-action">{item.id === type ? 'Selected template ✓' : 'Use this template →'}</span>
              </button>
            ))}
            {!filtered.length && <div className="card it-doc-empty"><strong>No templates found</strong><p>Try a broader search or choose All categories.</p><button type="button" className="btn btn-outline" onClick={() => { setSearch(''); setCategory('all') }}>Clear filters</button></div>}
          </div>
        </section>

        <aside className="it-doc-workbench">
          <div className="it-doc-workbench-head">
            <span className="it-doc-template-category">{selected.categoryLabel}</span>
            <h2>{selected.title}</h2>
            <p>{selected.purpose}</p>
          </div>
          <div className="it-doc-form">
            <label className="label" htmlFor="it-doc-client">Client / recipient</label>
            <select id="it-doc-client" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">General / not linked to a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="label" htmlFor="it-doc-reference">Document reference</label>
            <input id="it-doc-reference" className="input" value={docRef} onChange={(e) => setDocRef(e.target.value)} maxLength={80} />
            <label className="label" htmlFor="it-doc-notes">Business-specific details / additional clauses</label>
            <textarea id="it-doc-notes" className="textarea" rows={5} placeholder="Add system names, agreed dates, scope details, special requirements or clauses…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="it-doc-hint">Use placeholders for unknown information. Never include passwords, API keys or recovery codes in a document.</p>
            <div className="it-doc-actions">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => generate(false)}>{busy ? 'Generating…' : 'Download A4 PDF'}</button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => generate(true)}>Preview PDF</button>
            </div>
            <button type="button" className="it-doc-text-button" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>{showPreview ? 'Hide' : 'Show'} document outline</button>
          </div>
          {showPreview && <div className="it-doc-outline">
            <h3>Document outline</h3>
            <p className="muted">The generated PDF includes these sections and a sign-off record.</p>
            {selected.sections.map((section) => <div className="it-doc-outline-item" key={section.heading}><strong>{section.heading}</strong><p>{section.body}</p></div>)}
            {notes.trim() && <div className="it-doc-outline-item"><strong>Business-specific instructions</strong><p>{notes}</p></div>}
          </div>}
          <div className="it-doc-disclaimer"><strong>Review before issuing</strong><p>Templates are detailed operational drafts. Legal, privacy, contractual and regulatory requirements vary by context; adapt the document and obtain qualified review where needed.</p></div>
        </aside>
      </div>
    </div>
  )
}
