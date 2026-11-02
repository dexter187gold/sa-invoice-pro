/** Merged document studio templates: IT + vertical packs */
import { IT_DOCUMENT_TEMPLATES, getITDocumentTemplate } from './itDocumentTemplates.js'
import { RETAIL_DOCUMENT_TEMPLATES } from './retailCatalog.js'
import { TRADES_DOCUMENT_STUBS } from './tradesCatalog.js'
import { AUTO_DOCUMENT_STUBS } from './automotiveCatalog.js'
import { CONSULTING_DOCUMENT_STUBS } from './consultingCatalog.js'
import { HOSPITALITY_DOCUMENT_STUBS } from './hospitalityCatalog.js'
import { HEALTH_BEAUTY_DOCUMENT_STUBS } from './healthBeautyCatalog.js'
import { MEDICAL_DOCUMENT_STUBS } from './medicalCatalog.js'
import { LEGAL_DOCUMENT_STUBS } from './legalCatalog.js'

function stubsToTemplates(stubs, category, categoryLabel, tags) {
  return stubs.map((stub) => ({
    id: stub.id,
    title: stub.title,
    category,
    categoryLabel,
    purpose: stub.purpose,
    scope: stub.scope,
    tags,
    sections: [
      { heading: '1. Document control', body: `Title: ${stub.title}\nReference: ____________________\nDate: __________` },
      { heading: '2. Parties', body: 'Client / patient / guest: ____________________\nContact: ____________________\nOur reference: ____________________' },
      { heading: '3. Purpose', body: stub.purpose },
      { heading: '4. Scope', body: stub.scope },
      { heading: '5. Facts / background', body: 'Record relevant history, instructions and constraints.' },
      { heading: '6. Work performed / findings', body: 'Detail services, products, advice or procedures completed.' },
      { heading: '7. Recommendations', body: 'Next steps, risks and client responsibilities.' },
      { heading: '8. Commercial', body: 'Fees / deposits: ____________________\nInvoice / quote ref: ____________________' },
      { heading: '9. Outcome', body: 'Status: ____________________\nFollow-up date: ____________________' },
      { heading: '10. Sign-off', body: 'Prepared by: ____________________\nClient acceptance: ____________________\nDate: __________' },
    ],
  }))
}

export function getAllStudioTemplates() {
  const list = [...IT_DOCUMENT_TEMPLATES]
  for (const r of RETAIL_DOCUMENT_TEMPLATES) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(TRADES_DOCUMENT_STUBS, 'Trades', 'Trades & site work', ['trades', 'construction'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(AUTO_DOCUMENT_STUBS, 'Automotive', 'Automotive & workshop', ['auto', 'vehicle', 'workshop'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(CONSULTING_DOCUMENT_STUBS, 'Consulting', 'Consulting & professional', ['consulting', 'sow'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(HOSPITALITY_DOCUMENT_STUBS, 'Hospitality', 'Hospitality & events', ['hospitality', 'rooms', 'fb'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(HEALTH_BEAUTY_DOCUMENT_STUBS, 'Health & Beauty', 'Salon & wellness', ['beauty', 'health', 'salon'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(MEDICAL_DOCUMENT_STUBS, 'Medical', 'Clinic & medical', ['medical', 'clinic'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of stubsToTemplates(LEGAL_DOCUMENT_STUBS, 'Legal', 'Legal & practice', ['legal', 'attorney'])) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  return list
}

export function searchStudioTemplates(query, category = 'all') {
  const q = String(query || '').trim().toLowerCase()
  return getAllStudioTemplates().filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      (!q ||
        [item.title, item.purpose, item.scope, item.categoryLabel, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(q)),
  )
}

export function getStudioTemplate(id) {
  return getAllStudioTemplates().find((item) => item.id === id) || getITDocumentTemplate(id)
}

export function studioCategories() {
  return ['all', ...new Set(getAllStudioTemplates().map((item) => item.category))]
}
