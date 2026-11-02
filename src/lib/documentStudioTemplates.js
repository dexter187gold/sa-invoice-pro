/** Merged document studio templates: IT + Retail + Trades */
import { IT_DOCUMENT_TEMPLATES, getITDocumentTemplate } from './itDocumentTemplates.js'
import { RETAIL_DOCUMENT_TEMPLATES } from './retailCatalog.js'
import { TRADES_DOCUMENT_STUBS } from './tradesCatalog.js'

function tradesAsTemplates() {
  return TRADES_DOCUMENT_STUBS.map((stub) => ({
    id: stub.id,
    title: stub.title,
    category: 'Trades',
    categoryLabel: 'Trades & site work',
    purpose: stub.purpose,
    scope: stub.scope,
    tags: ['trades', 'construction'],
    sections: [
      { heading: '1. Document control', body: `Title: ${stub.title}\nJob / quote ref: ____________________\nSite: ____________________\nDate: __________` },
      { heading: '2. Purpose', body: stub.purpose },
      { heading: '3. Scope', body: stub.scope },
      { heading: '4. Details', body: 'Describe work, materials, measurements, and client instructions. Attach photos separately.' },
      { heading: '5. Commercial impact', body: 'Extra cost / credit: ____________________\nAffects completion date: Yes / No · New date: __________' },
      { heading: '6. Sign-off', body: 'Technician: ____________________\nClient: ____________________\nDate: __________' },
    ],
  }))
}

export function getAllStudioTemplates() {
  const list = [...IT_DOCUMENT_TEMPLATES]
  for (const r of RETAIL_DOCUMENT_TEMPLATES) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }
  for (const r of tradesAsTemplates()) {
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
