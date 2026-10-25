export const PHASES = [
  {
    id: 'P0',
    title: 'Demo-ready desk',
    status: 'done',
    items: [
      { id: 'portal', label: 'Client portal link + card', done: true },
      { id: 'sig', label: 'Signature pad + PDF embed', done: true },
      { id: 'itpack', label: 'IT service pack', done: true },
      { id: 'jobbill', label: 'Job → invoice prefill', done: true },
      { id: 'pulse', label: 'Pulse home + chase', done: true },
    ],
  },
  {
    id: 'P1',
    title: 'Client-facing proof',
    status: 'active',
    items: [
      { id: 'pdfsig', label: 'Signature on PDF', done: true },
      { id: 'onboard', label: 'Onboarding checklist', done: true },
      { id: 'wa-lang', label: 'EN/AF WhatsApp templates', done: true },
      { id: 'photos', label: 'Job photos before/after', done: true },
      { id: 'portal-brand', label: 'Portal brand notes on share', done: true },
    ],
  },
  {
    id: 'P2',
    title: 'Daily ops lock-in',
    status: 'active',
    items: [
      { id: 'ageing', label: 'Ageing report + WA remind', done: true },
      { id: 'credit', label: 'Credit notes helper', done: true },
      { id: 'stock', label: 'Stock adjust on products', done: true },
      { id: 'bank', label: 'Bank CSV match library', done: true },
      { id: 'recurring', label: 'Recurring invoices', done: true },
    ],
  },
  {
    id: 'P3',
    title: 'Sellable B2B',
    status: 'active',
    items: [
      { id: 'audit', label: 'Local audit log', done: true },
      { id: 'tiers', label: 'License tiers Solo/Shop/Multi', done: true },
      { id: 'license-ui', label: 'License activation page', done: true },
      { id: 'seats', label: 'Multi-seat roles (next)', done: false },
      { id: 'metrics', label: 'Usage metrics for upsell (next)', done: false },
    ],
  },
  {
    id: 'P4',
    title: 'Premium platform',
    status: 'planned',
    items: [
      { id: 'webhooks', label: 'Outbound webhooks', done: false },
      { id: 'xero', label: 'Accounting CSV export', done: true },
      { id: 'api', label: 'API keys', done: false },
      { id: 'white', label: 'White-label domain', done: false },
      { id: 'e2e', label: 'Automated E2E suite', done: false },
    ],
  },
]

export function phaseProgress() {
  let done = 0
  let total = 0
  for (const p of PHASES) {
    for (const i of p.items) {
      total++
      if (i.done) done++
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}
