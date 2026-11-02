/** Merged document studio templates: IT + all vertical packs (10-section stubs) */
import { IT_DOCUMENT_TEMPLATES, getITDocumentTemplate } from './itDocumentTemplates.js'
import { RETAIL_DOCUMENT_TEMPLATES } from './retailCatalog.js'
import { TRADES_DOCUMENT_STUBS } from './tradesCatalog.js'
import { AUTO_DOCUMENT_STUBS } from './automotiveCatalog.js'
import { CONSULTING_DOCUMENT_STUBS } from './consultingCatalog.js'
import { HOSPITALITY_DOCUMENT_STUBS } from './hospitalityCatalog.js'
import { HEALTH_BEAUTY_DOCUMENT_STUBS } from './healthBeautyCatalog.js'
import { MEDICAL_DOCUMENT_STUBS } from './medicalCatalog.js'
import { LEGAL_DOCUMENT_STUBS } from './legalCatalog.js'
import { AGRI_DOCUMENT_STUBS } from './agricultureCatalog.js'
import { ACCOUNTING_DOCUMENT_STUBS } from './accountingCatalog.js'
import { LOGISTICS_DOCUMENT_STUBS } from './logisticsCatalog.js'
import { EDU_DOCUMENT_STUBS } from './educationCatalog.js'
import { MFG_DOCUMENT_STUBS } from './manufacturingCatalog.js'
import { PROP_DOCUMENT_STUBS } from './propertyCatalog.js'
import { SEC_DOCUMENT_STUBS } from './securityCatalog.js'
import { CLEAN_DOCUMENT_STUBS } from './cleaningCatalog.js'
import { CREATIVE_DOCUMENT_STUBS } from './creativeCatalog.js'
import { NPO_DOCUMENT_STUBS } from './nonprofitCatalog.js'

function stubsToTemplates(stubs, category, categoryLabel, tags) {
  return (stubs || []).map((stub) => ({
    id: stub.id,
    title: stub.title,
    category,
    categoryLabel,
    purpose: stub.purpose,
    scope: stub.scope,
    tags,
    sections: [
      { heading: '1. Document control', body: `Title: ${stub.title}\nReference: ____________________\nDate: __________` },
      { heading: '2. Parties', body: 'Client / customer: ____________________\nContact: ____________________\nOur reference: ____________________' },
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

const VERTICALS = [
  [TRADES_DOCUMENT_STUBS, 'Trades', 'Trades & site work', ['trades']],
  [AUTO_DOCUMENT_STUBS, 'Automotive', 'Automotive & workshop', ['auto']],
  [CONSULTING_DOCUMENT_STUBS, 'Consulting', 'Consulting & professional', ['consulting']],
  [HOSPITALITY_DOCUMENT_STUBS, 'Hospitality', 'Hospitality & events', ['hospitality']],
  [HEALTH_BEAUTY_DOCUMENT_STUBS, 'Health & Beauty', 'Salon & wellness', ['beauty']],
  [MEDICAL_DOCUMENT_STUBS, 'Medical', 'Clinic & medical', ['medical']],
  [LEGAL_DOCUMENT_STUBS, 'Legal', 'Legal & practice', ['legal']],
  [AGRI_DOCUMENT_STUBS, 'Agriculture', 'Farming & agri', ['agriculture']],
  [ACCOUNTING_DOCUMENT_STUBS, 'Accounting', 'Accounting & tax', ['accounting']],
  [LOGISTICS_DOCUMENT_STUBS, 'Logistics', 'Transport & logistics', ['logistics']],
  [EDU_DOCUMENT_STUBS, 'Education', 'Training & education', ['education']],
  [MFG_DOCUMENT_STUBS, 'Manufacturing', 'Production & manufacturing', ['manufacturing']],
  [PROP_DOCUMENT_STUBS, 'Property', 'Property & estate', ['property']],
  [SEC_DOCUMENT_STUBS, 'Security', 'Security & guarding', ['security']],
  [CLEAN_DOCUMENT_STUBS, 'Cleaning', 'Cleaning & hygiene', ['cleaning']],
  [CREATIVE_DOCUMENT_STUBS, 'Creative', 'Creative & media', ['creative']],
  [NPO_DOCUMENT_STUBS, 'Non-profit', 'NPO & community', ['nonprofit']],
]

export function getAllStudioTemplates() {
  const list = [...IT_DOCUMENT_TEMPLATES]
  try {
    for (const r of RETAIL_DOCUMENT_TEMPLATES || []) {
      if (!list.some((x) => x.id === r.id)) list.push(r)
    }
  } catch {}
  for (const [stubs, cat, label, tags] of VERTICALS) {
    for (const r of stubsToTemplates(stubs, cat, label, tags)) {
      if (!list.some((x) => x.id === r.id)) list.push(r)
    }
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
