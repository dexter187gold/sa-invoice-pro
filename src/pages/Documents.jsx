
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DOC_TYPES, APP_NAME } from '../config'


export default function Documents() {
  const { clients, company, toast } = useApp()
  const [type, setType] = useState('sla')
  const [clientId, setClientId] = useState('')
  const [ref, setRef] = useState('DOC-' + Date.now().toString().slice(-6))
  const [notes, setNotes] = useState('')

  const fillDemo = () => {
    if (clients[0]) setClientId(clients[0].id)
    setNotes('Standard commercial terms apply. Fees billed in ZAR. Response times as agreed in schedule.')
    setRef('DOC-DEMO-' + new Date().getFullYear())
    toast('Demo fields filled', 'success')
  }

  const generate = async () => {
    const client = clients.find((c) => String(c.id) === String(clientId)) || { name: 'Valued Client' }
    const co = company || {}
    const title = DOC_TYPES.find((d) => d.id === type)?.label || 'Document'
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 20
    doc.setFontSize(14)
    doc.text(co.name || APP_NAME, 14, y)
    y += 10
    doc.setFontSize(12)
    doc.text(title.toUpperCase(), 14, y)
    y += 8
    doc.setFontSize(10)
    doc.text('Reference: ' + ref, 14, y)
    y += 6
    doc.text('Date: ' + new Date().toLocaleDateString('en-ZA'), 14, y)
    y += 10
    doc.text('Prepared for: ' + (client.name || ''), 14, y)
    y += 10
    const body = [
      `This document is issued by ${co.name || APP_NAME} in favour of ${client.name || 'the Client'}.`,
      notes || 'Terms as mutually agreed. Governing law: Republic of South Africa.',
      'This is a template for operational use and does not replace formal legal advice.',
    ]
    for (const para of body) {
      const lines = doc.splitTextToSize(para, 180)
      doc.text(lines, 14, y)
      y += lines.length * 5 + 4
    }
    doc.setFontSize(8)
    doc.text(APP_NAME + ' · document generator', 14, 285)
    doc.save(ref + '.pdf')
    toast('PDF downloaded', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document generator</h1>
          <p className="subtitle">SLA, letters, POPIA notice and more</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fillDemo}>Load demo</button>
      </div>
      <div className="card form-grid">
        <div>
          <label className="label">Document type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Client</label>
          <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reference</label>
          <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes / clauses</label>
          <textarea className="textarea" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={generate}>Generate PDF</button>
      </div>
    </div>
  )
}
