import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

export const FAQ = [
  { q: 'Create an invoice', a: 'Go to **Invoices → New invoice**. Pick a client, add line items, then **Save**. Use **Preview PDF** before sending.' },
  { q: 'Partial payment', a: 'Open the invoice, set status to **partial**, then log the amount under **Payments**. Balance due updates automatically.' },
  { q: 'Link ticket to invoice', a: 'Copy the invoice number from Invoices, open the ticket, and paste it in **Notes** or convert time later from the ticket desk.' },
  { q: 'Invoice preferences', a: '**Settings → Invoice preferences**. Toggle job fields, defaults, and what appears on the PDF. Save once.' },
  { q: 'Tickets board', a: '**Tickets** → switch **Board**. Use **Start** / **Resolve** or open a ticket to edit status, priority, and details.' },
  { q: 'Backup data', a: '**Settings → Backup → Download backup**. Import the JSON on another device to restore.' },
  { q: 'VAT', a: '**Settings → VAT & theme**. Enable VAT and set rate (e.g. 0.15 for 15%). Totals recalculate on invoices.' },
  { q: 'Dark mode', a: 'Sidebar **Dark mode** or press **Ctrl+D**. Preference is stored locally.' },
  { q: 'Command palette', a: 'Press **Ctrl+K** (or **Cmd+K**) to jump to pages, create invoices, or search.' },
  { q: 'Company details on PDF', a: '**Settings → Company**. Name, address, VAT, and bank details print on tax invoices.' },
  { q: 'Refund', a: 'Record a negative payment or issue a credit note via a new invoice with negative lines; mark original as adjusted in notes.' },
  { q: 'Offline', a: 'Data lives in this browser (IndexedDB). Work offline; sync is local until you export a backup.' },
]

const ROUTE_HINTS = {
  '/': [
    'Welcome — start from **Invoices** or open a **Ticket** for a job.',
    'Press **Ctrl+K** for the command palette.',
  ],
  '/dashboard': [
    'Dashboard KPIs use local invoices and payments.',
    'Aged debtors appear when invoices are overdue.',
  ],
  '/invoices': [
    'Click **New invoice** to bill a client.',
    'Filter by status to find unpaid or partial invoices.',
  ],
  '/invoices/new': [
    'Select a client first, then add line items from the catalog or free text.',
    'Job details (PO, site, serials) show when enabled in Invoice preferences.',
    'Preview PDF before saving if you need to check layout.',
  ],
  '/tickets': [
    'Use **List** or **Board**. **New ticket** logs a support or site job.',
    'Priority **Urgent** surfaces in the top stats chips.',
  ],
  '/clients': [
    'Add clients before invoicing — or create one inline on the invoice form.',
  ],
  '/settings': [
    '**Invoice preferences** controls form blocks and PDF defaults.',
    'Export a backup before major changes.',
  ],
  '/documents': [
    'Pick a document type, fill variables, then generate PDF.',
  ],
  '/payments': [
    'Log EFT or card payments against an invoice to reduce balance due.',
  ],
  '/quotes': [
    'Convert a quote to an invoice when the client accepts.',
  ],
  '/login': [
    'Create an account once on this device — data stays in the browser.',
  ],
}

export function useAppAssistant() {
  const { pathname } = useLocation()
  const base = pathname.startsWith('/invoices/') && pathname !== '/invoices/new'
    ? '/invoices'
    : pathname

  const hints = useMemo(() => {
    if (ROUTE_HINTS[pathname]) return ROUTE_HINTS[pathname]
    if (pathname.startsWith('/invoices/')) {
      return [
        'Edit lines and status, then Save.',
        'Use Preview PDF to check the tax invoice layout.',
        'Partial status pairs with payments on the Payments page.',
      ]
    }
    return ROUTE_HINTS[base] || [
      'Use the sidebar to move between Sales, Operations, and Finance.',
      'Stuck? Search the FAQ in this panel.',
    ]
  }, [pathname, base])

  const searchFaq = (query) => {
    const q = String(query || '').trim().toLowerCase()
    if (!q) return FAQ
    return FAQ.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }

  return { pathname, hints, faq: FAQ, searchFaq }
}
