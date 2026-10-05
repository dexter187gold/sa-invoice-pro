
import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { DOC_TYPES, APP_NAME, APP_VERSION } from '../config'
import { loadJsPdf } from '../lib/loadJsPdf'

const GREEN = [0, 122, 77]
const SLATE = [51, 65, 85]
const MUTED = [100, 116, 139]

function typeBody(type, co, client, notes) {
  const company = co.name || APP_NAME
  const clientName = client.name || 'the Client'
  const shared = notes?.trim() || ''

  const blocks = {
    sla: [
      `SERVICE LEVEL AGREEMENT`,
      `This Service Level Agreement (SLA) is entered into between ${company} ("Service Provider") and ${clientName} ("Client").`,
      `1. Scope of services — Services are as agreed in writing between the parties (quotes, job cards or emails).`,
      `2. Response times — Critical issues: acknowledgement within one business day. Non-critical: within two business days, unless otherwise agreed.`,
      `3. Availability — Services are provided during normal South African business hours unless a separate after-hours arrangement is agreed.`,
      `4. Fees — Fees are billed in South African Rand (ZAR). Payment terms are as stated on invoices (default: COD / on completion unless account terms apply).`,
      `5. Client obligations — Client shall provide timely access, accurate information, and valid software licences where required.`,
      `6. Liability — Liability is limited to fees paid for the affected service period, to the extent permitted by the Consumer Protection Act 68 of 2008.`,
      `7. Term — This SLA continues until terminated by either party on 30 days' written notice, or immediately for material breach.`,
      `8. Governing law — Laws of the Republic of South Africa.`,
    ],
    consulting: [
      `CONSULTING ENGAGEMENT LETTER`,
      `Dear ${clientName},`,
      `${company} is pleased to confirm the consulting engagement described below.`,
      `Scope — Professional advisory and technical services as mutually agreed. Deliverables will be confirmed in writing before major work begins.`,
      `Fees — Charged in ZAR according to the agreed rate or fixed fee. Out-of-pocket expenses (travel, parts) are billed at cost unless included.`,
      `Confidentiality — Both parties will protect confidential information and only use it for the engagement.`,
      `Independence — ${company} acts as an independent contractor. No employment relationship is created.`,
      `Acceptance — Signature or email confirmation of this letter constitutes acceptance of these terms.`,
    ],
    tax_clearance_support: [
      `LETTER OF GOOD STANDING / TAX SUPPORT`,
      `To whom it may concern,`,
      `This letter confirms that ${clientName} is a client of ${company}.`,
      `We support our clients with operational documentation that may assist their tax and compliance processes. This letter is not a SARS tax clearance certificate and does not replace any official SARS document.`,
      `For formal tax clearance, the client must apply through SARS eFiling / the prescribed channels.`,
      `Please contact ${company} should you require further operational confirmation.`,
    ],
    quote_letter: [
      `FORMAL QUOTATION LETTER`,
      `Dear ${clientName},`,
      `Thank you for the opportunity to quote. Please find a formal quotation summary below. A detailed line-item quote can be generated from the Quotes module.`,
      `All prices are in ZAR. VAT is applied where the Service Provider is registered for VAT.`,
      `This quotation is valid for 14 days from the date of issue unless otherwise stated.`,
      `Acceptance of the quote (in writing or by instructing work to proceed) constitutes agreement to the standard terms of ${company}.`,
    ],
    popia_notice: [
      `POPIA PRIVACY NOTICE`,
      `${company} ("we") processes personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA).`,
      `1. Purpose — We collect and process personal information only as needed to provide invoicing, support, accounting and related business services.`,
      `2. Types of information — Name, contact details, company details, identity or tax numbers where required for compliance, and transaction records.`,
      `3. Sharing — We do not sell personal information. We may share data with service providers (e.g. payment processors) under appropriate agreements, or where required by law.`,
      `4. Security — Reasonable technical and organisational measures are applied to protect information against loss or unauthorised access.`,
      `5. Rights — You may request access to, correction of, or deletion of your personal information, subject to legal retention requirements.`,
      `6. Contact — Direct POPIA requests to the contact details of ${company} shown on this document.`,
      `7. Retention — Records are kept only as long as needed for the purpose collected or as required by South African law.`,
    ],
    invoice_cover: [
      `TAX INVOICE COVER LETTER`,
      `Dear ${clientName},`,
      `Please find attached / accompanying our tax invoice for services rendered.`,
      `Payment is due as indicated on the invoice. Kindly use the invoice number as payment reference.`,
      `Banking details (if applicable) appear on the invoice. Proof of payment may be sent to our email address.`,
      `Thank you for your business.`,
    ],
    job_card: [
      `JOB CARD SUMMARY`,
      `Client: ${clientName}`,
      `This job card records work requested and performed by ${company}.`,
      `Work description and parts used should be listed in the notes section or attached schedule.`,
      `Sign-off by the client confirms that the work described was completed to a satisfactory standard, subject to any warranty terms stated on the related invoice or quote.`,
      `Devices remain the client's responsibility for data backup. ${company} is not liable for data loss except as required by law.`,
    ],
    nda: [
      `NON-DISCLOSURE AGREEMENT (LITE)`,
      `This NDA is between ${company} and ${clientName}.`,
      `1. Confidential Information means non-public business, technical or customer information disclosed by either party.`,
      `2. Each party agrees not to disclose the other's Confidential Information to third parties and to use it only for the permitted business purpose.`,
      `3. Exceptions — Information that is public, independently developed, or required to be disclosed by law is excluded.`,
      `4. Duration — Obligations continue for 3 years after disclosure, or longer where required by law for trade secrets.`,
      `5. This is a simplified NDA for operational use. For complex transactions, seek independent legal advice.`,
      `6. Governing law — Republic of South Africa.`,
    ],
    terms: [
      `STANDARD TERMS OF BUSINESS`,
      `These terms apply to services supplied by ${company} to ${clientName} unless a signed contract states otherwise.`,
      `1. Quotes are valid for 14 days. Work starts only after acceptance.`,
      `2. Payment — COD / on completion unless account terms are agreed in writing. Late amounts may attract reasonable recovery costs.`,
      `3. Scope changes — Extra work outside the agreed scope is quoted separately.`,
      `4. Data & licences — Client is responsible for backups and valid software licences.`,
      `5. Warranty — Workmanship warranty as stated on the invoice (default 14 days) excluding user changes, malware, or hardware failure.`,
      `6. Liability — Limited to fees paid for the service, to the maximum allowed under the CPA.`,
      `7. POPIA — Personal information is processed only to deliver the service and comply with law.`,
      `8. Law — South African law applies.`,
    ],
  }

  const list = blocks[type] || [
    `DOCUMENT`,
    `Issued by ${company} for ${clientName}.`,
    `Terms as mutually agreed. Governing law: Republic of South Africa.`,
  ]
  if (shared) list.push(`Additional notes: ${shared}`)
  list.push(`This template is for operational use and does not replace formal legal advice.`)
  return list
}

export default function Documents() {
  const { clients, company, toast } = useApp()
  const [type, setType] = useState('sla')
  const [clientId, setClientId] = useState('')
  const [docRef, setDocRef] = useState('DOC-' + Date.now().toString().slice(-6))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const fillDemo = () => {
    if (clients[0]) setClientId(String(clients[0].id))
    setNotes('Standard commercial terms apply. Fees billed in ZAR. Response times as agreed in schedule.')
    setDocRef('DOC-DEMO-' + new Date().getFullYear())
    toast('Demo fields filled', 'success')
  }

  const buildPdf = async () => {
    const client = clients.find((c) => String(c.id) === String(clientId)) || { name: 'Valued Client' }
    const co = company || {}
    const title = DOC_TYPES.find((d) => d.id === type)?.label || 'Document'
    const jsPDF = await loadJsPdf()
    const doc = new jsPDF('p', 'mm', 'a4')

    let y = 18
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...GREEN)
    doc.text(String(co.name || APP_NAME).toUpperCase(), 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    const contact = [co.address, co.phone, co.email, co.vatNumber && `VAT ${co.vatNumber}`].filter(Boolean).join(' · ')
    if (contact) {
      const lines = doc.splitTextToSize(contact, 182)
      doc.text(lines, 14, y)
      y += lines.length * 4 + 2
    }
    doc.setDrawColor(226, 232, 240)
    doc.line(14, y, 196, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...SLATE)
    doc.text(title.toUpperCase(), 14, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(`Reference: ${docRef}`, 14, y)
    doc.text(`Date: ${new Date().toLocaleDateString('en-ZA')}`, 120, y)
    y += 5
    doc.text(`Prepared for: ${client.name || 'Valued Client'}`, 14, y)
    y += 10

    doc.setTextColor(...SLATE)
    doc.setFontSize(9.5)
    const body = typeBody(type, co, client, notes)
    for (const para of body) {
      if (y > 270) {
        doc.addPage()
        y = 18
      }
      const lines = doc.splitTextToSize(para, 182)
      if (para === body[0]) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
      }
      doc.text(lines, 14, y)
      y += lines.length * 4.6 + 3
    }

    if (y > 250) {
      doc.addPage()
      y = 18
    }
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...GREEN)
    doc.text('ACCEPTANCE', 14, y)
    y += 10
    doc.setDrawColor(...MUTED)
    doc.setLineWidth(0.3)
    doc.line(14, y + 8, 80, y + 8)
    doc.line(110, y + 8, 180, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text('Authorised signatory / Client', 14, y + 13)
    doc.text('Date / Service provider', 110, y + 13)

    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(...MUTED)
      doc.text(`${APP_NAME} · document generator · v${APP_VERSION}`, 105, 290, { align: 'center' })
    }
    return doc
  }

  const generate = async (open = false) => {
    if (busy) return
    setBusy(true)
    try {
      const doc = await buildPdf()
      const name = `${(docRef || 'document').replace(/[^\w.-]+/g, '_')}.pdf`
      if (open) {
        const url = URL.createObjectURL(doc.output('blob'))
        const w = window.open(url, '_blank')
        if (!w) {
          doc.save(name)
          toast('Popup blocked — PDF downloaded instead', 'info')
        } else {
          toast('Preview opened', 'success')
        }
      } else {
        doc.save(name)
        toast('PDF downloaded', 'success')
      }
    } catch (err) {
      console.error(err)
      toast(err?.message || String(err) || 'PDF generation failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document generator</h1>
          <p className="subtitle">SLA, letters, POPIA notice and more · type-specific templates</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fillDemo}>
          Load demo
        </button>
      </div>
      <div className="card form-grid">
        <div>
          <label className="label">Document type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Client</label>
          <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select… (optional)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Reference</label>
          <input className="input" value={docRef} onChange={(e) => setDocRef(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes / extra clauses</label>
          <textarea className="textarea" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => generate(false)}>
            {busy ? 'Generating…' : 'Download PDF'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => generate(true)}>
            Preview PDF
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Templates are operational drafts for South African use. They are not a substitute for formal legal advice.
        </p>
      </div>
    </div>
  )
}
