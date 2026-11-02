import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import * as db from '../lib/db'
import { STORES } from '../lib/db'
import { APP_NAME, APP_VERSION } from '../config'
import { loadJsPdf } from '../lib/loadJsPdf'
import { openJsPdf, downloadJsPdf, sharePdf } from '../lib/pdfOpen'
import { getAllStudioTemplates, searchStudioTemplates, getStudioTemplate, studioCategories } from '../lib/documentStudioTemplates'

const DOCUMENT_THEMES = [
  { id: 'forest', label: 'Forest Corporate', description: 'SA green, premium and finance-ready', primary: [0, 122, 77], dark: [8, 48, 37], accent: [167, 243, 208], ink: [30, 41, 59], muted: [100, 116, 139], soft: [235, 247, 241], stripe: [244, 248, 247] },
  { id: 'navy', label: 'Navy Executive', description: 'Formal blue for proposals and policies', primary: [29, 78, 137], dark: [15, 35, 65], accent: [191, 219, 254], ink: [30, 41, 59], muted: [91, 105, 124], soft: [235, 243, 252], stripe: [245, 248, 252] },
  { id: 'mono', label: 'Monochrome', description: 'Ink-saving, clean black and white', primary: [45, 55, 65], dark: [30, 35, 40], accent: [220, 225, 230], ink: [35, 40, 45], muted: [95, 100, 105], soft: [240, 242, 244], stripe: [250, 250, 250] },
  { id: 'sand', label: 'Warm Sand', description: 'Warm neutral for client-facing reports', primary: [146, 84, 35], dark: [66, 43, 26], accent: [253, 230, 190], ink: [68, 53, 39], muted: [130, 105, 80], soft: [250, 242, 229], stripe: [253, 249, 242] },
  { id: 'violet', label: 'Modern Violet', description: 'Contemporary creative and technology style', primary: [109, 40, 217], dark: [38, 20, 68], accent: [221, 214, 254], ink: [39, 39, 55], muted: [107, 100, 130], soft: [245, 240, 255], stripe: [250, 248, 255] },
]
function getDocumentTheme(id) {
  return DOCUMENT_THEMES.find((theme) => theme.id === id) || DOCUMENT_THEMES[0]
}

const CATEGORIES = studioCategories()
const GREEN = [0, 122, 77]
const SLATE = [30, 41, 59]
const MUTED = [100, 116, 139]

function safeText(value, fallback = 'To be completed') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export default function Documents() {
  const { clients = [], company, toast, invoices = [], quotes = [], tickets = [], products = [], services = [], employees = [], timeEntries = [] } = useApp()
  const [type, setType] = useState('it_assessment')
  const [documentThemeId, setDocumentThemeId] = useState(() => {
    try { return localStorage.getItem('sa_document_theme') || 'forest' } catch { return 'forest' }
  })
  const [clientId, setClientId] = useState('')
  const [docRef, setDocRef] = useState(() => 'DOC-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5))
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [busy, setBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [sourceKey, setSourceKey] = useState('')
  const [history, setHistory] = useState([])

  const sourceOptions = useMemo(() => {
    const groups = [
      ['Client', clients], ['Invoice', invoices], ['Quote', quotes], ['Support ticket', tickets],
      ['Product / asset', products], ['IT service', services], ['Employee', employees], ['Time entry', timeEntries],
    ]
    return groups.flatMap(([kind, rows]) => rows.map((row) => {
      const id = String(row.id ?? '')
      const title = row.name || row.title || row.number || row.subject || row.description || `${kind} ${id}`
      const label = `${kind} · ${title}${row.number && row.number !== title ? ` · ${row.number}` : ''}`
      return { key: `${kind}:${id}`, kind, row, label }
    })).filter((item) => item.row && item.row.id != null)
  }, [clients, invoices, quotes, tickets, products, services, employees, timeEntries])
  const linkedSource = sourceOptions.find((item) => item.key === sourceKey) || null
  const refreshHistory = async () => {
    const rows = await db.getAll(STORES.documentRenders)
    setHistory((rows || []).sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''))).slice(0, 12))
  }
  useEffect(() => { refreshHistory().catch(() => {}) }, [])

  const selected = getStudioTemplate(type)
  const documentTheme = getDocumentTheme(documentThemeId)
  const chooseDocumentTheme = (id) => {
    setDocumentThemeId(id)
    try { localStorage.setItem('sa_document_theme', id) } catch {}
  }
  const client = clients.find((c) => String(c.id) === String(clientId)) || { name: 'Client / business owner' }
  const filtered = useMemo(() => searchStudioTemplates(search, category), [search, category])
  const fillDemo = () => {
    if (clients[0]) setClientId(String(clients[0].id))
    setNotes('Business priority: improve reliability and document ownership. Confirm scope before approval.')
    setDocRef('DOC-DEMO-' + new Date().getFullYear())
    toast?.('Example details added — review and replace before issuing.', 'success')
  }

  const buildPdf = async () => {
    const co = company || {}
    const template = getStudioTemplate(type)
    const palette = getDocumentTheme(documentThemeId)
    const primary = palette.primary
    const dark = palette.dark
    const ink = palette.ink
    const muted = palette.muted
    const soft = palette.soft
    const stripe = palette.stripe
    const source = linkedSource
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
      doc.setTextColor(...primary)
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
      doc.setFillColor(...soft)
      doc.roundedRect(left - 1, y - 3.5, width + 2, 7, 1.2, 1.2, 'F')
      drawWrapped(heading, 10, 4.5, 'bold', GREEN, 2)
      drawWrapped(body, 9.2, 4.6, 'normal', SLATE, 5)
    }

    doc.setFillColor(...dark)
    doc.rect(0, 0, pageW, 42, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(String(co.name || APP_NAME).toUpperCase(), left, 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const contact = [co.address, co.phone, co.email, co.vatNumber ? 'VAT ' + co.vatNumber : ''].filter(Boolean).join('  •  ')
    if (contact) doc.text(doc.splitTextToSize(contact, width), left, 22)
    doc.setDrawColor(...primary)
    doc.line(left, 28, pageW - right, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(String(template.title || 'Document').toUpperCase(), left, 36)
    y = 51

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...muted)
    const metaRows = [
      ['Document reference', safeText(docRef)],
      ['Prepared for', safeText(client.name, 'Client / business owner')],
      ['Prepared by', safeText(co.name, APP_NAME)],
      ['Issue date', new Date().toLocaleDateString('en-ZA')],
      ['Status', 'DRAFT — review placeholders before use'],
    ]
    const colW = width / 2
    metaRows.forEach(([label, value], index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = left + col * colW
      const yy = y + row * 13
      doc.setFillColor(...(row % 2 ? stripe : soft))
      doc.roundedRect(x, yy - 4.5, colW - 2, 11, 1.2, 1.2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...muted)
      doc.text(label.toUpperCase(), x + 3, yy - 0.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.setTextColor(...ink)
      doc.text(doc.splitTextToSize(value, colW - 8).slice(0, 2), x + 3, yy + 3.5)
    })
    y += Math.ceil(metaRows.length / 2) * 13 + 4
    drawWrapped('DOCUMENT PURPOSE', 9, 4.5, 'bold', GREEN, 2)
    drawWrapped(template.purpose || '', 9.5, 4.8, 'normal', SLATE, 4)
    drawWrapped('SCOPE SUMMARY', 9, 4.5, 'bold', GREEN, 2)
    drawWrapped(template.scope || '', 9.5, 4.8, 'normal', SLATE, 6)

    for (const section of template.sections || []) drawSection(section.heading, section.body)
    if (source) {
      const row = source.row
      drawSection('Linked SA Invoice Pro record', [
        `Type: ${source.kind}`,
        `ID: ${row.id}`,
        `Title: ${row.title || row.name || row.number || '—'}`,
      ].join('\n'))
    }
    if (notes.trim()) drawSection('Additional notes', notes.trim())

    ensureSpace(28)
    drawWrapped('APPROVAL RECORD', 10, 4.5, 'bold', GREEN, 4)
    const signY = y
    doc.setDrawColor(...MUTED)
    doc.line(left, signY + 12, left + 72, signY + 12)
    doc.line(left + 92, signY + 12, pageW - right, signY + 12)
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text('Prepared / reviewed', left, signY + 17)
    doc.text('Approved by', left + 92, signY + 17)

    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(...muted)
      doc.text(String(co.name || APP_NAME) + ' · Document Studio · v' + APP_VERSION, left, pageH - 9)
      doc.text(i + ' / ' + totalPages, pageW - right, pageH - 9, { align: 'right' })
    }
    return doc
  }

  const generate = async (open = false) => {
    if (busy) return
    setBusy(true)
    try {
      const doc = await buildPdf()
      const name = (docRef || 'document').replace(/[^\w.-]+/g, '_') + '.pdf'
      if (open) {
        await openJsPdf(doc, name)
        toast?.('Document preview ready.', 'success')
      } else {
        await downloadJsPdf(doc, name)
        try {
          await db.add(STORES.documentRenders, {
            documentThemeId, documentRef: safeText(docRef), templateId: selected.id, templateTitle: selected.title,
            category: selected.category, clientId: clientId || null, clientName: safeText(client.name),
            notes: notes.trim(), generatedAt: new Date().toISOString(), fileName: name,
          })
          await refreshHistory()
        } catch {}
        toast?.('PDF generated.', 'success')
      }
    } catch (err) {
      toast?.(err?.message || 'PDF generation failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="it-doc-studio">
      <div className="page-header">
        <div>
          <p className="it-doc-eyebrow">SA INVOICE PRO · DOCUMENT STUDIO</p>
          <h1>Document Studio</h1>
          <p className="subtitle">IT, retail and trades templates — branded A4 PDFs for real workflows.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fillDemo}>Load example</button>
      </div>

      <div className="it-doc-hero">
        <div>
          <span className="it-doc-hero-kicker">TEMPLATE LIBRARY</span>
          <h2>Build documents ready for business workflows.</h2>
          <div className="it-doc-hero-stats">
            <span><strong>{getAllStudioTemplates().length}</strong> templates</span>
            <span><strong>A4</strong> print-ready</span>
          </div>
        </div>
      </div>

      <div className="it-doc-layout">
        <section className="it-doc-library">
          <div className="it-doc-section-head">
            <div><h2>Template library</h2><p>Search by task, category or name.</p></div>
            <span className="it-doc-count">{filtered.length} shown</span>
          </div>
          <div className="it-doc-search-row">
            <input className="input" aria-label="Search templates" placeholder="Search security, retail, trades…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {CATEGORIES.filter((item) => item !== 'all').map((item) => (
                <option key={item} value={item}>{getAllStudioTemplates().find((t) => t.category === item)?.categoryLabel || item}</option>
              ))}
            </select>
          </div>
          <div className="it-doc-table-wrap">
            <table className="table it-doc-table">
              <thead><tr><th>Document template</th><th>Category</th><th>Purpose</th><th>Selection</th></tr></thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className={item.id === type ? 'it-doc-row-selected' : ''}>
                    <td><strong>{item.title}</strong></td>
                    <td><span className="it-doc-template-category">{item.categoryLabel}</span></td>
                    <td className="it-doc-table-purpose">{item.purpose}</td>
                    <td><button type="button" className={item.id === type ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setType(item.id)}>{item.id === type ? 'Selected' : 'Use template'}</button></td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan="4"><div className="it-doc-empty"><strong>No templates found</strong></div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="it-doc-workbench">
          <div className="it-doc-workbench-head">
            <span className="it-doc-template-category">{selected?.categoryLabel}</span>
            <h2>{selected?.title}</h2>
            <p>{selected?.purpose}</p>
          </div>
          <div className="it-doc-form">
            <label className="label">Client / recipient</label>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">General / not linked</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="label">Document reference</label>
            <input className="input" value={docRef} onChange={(e) => setDocRef(e.target.value)} />
            <label className="label">Additional notes</label>
            <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => generate(false)}>{busy ? 'Working…' : 'Download PDF'}</button>
              <button type="button" className="btn btn-outline" disabled={busy} onClick={() => generate(true)}>Preview</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
