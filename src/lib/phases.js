export const PHASES = [
  { id: 'P0', title: 'Demo-ready desk', status: 'done', items: [
    { id: 'portal', label: 'Client portal link + card', done: true },
    { id: 'sig', label: 'Signature pad + PDF embed', done: true },
    { id: 'itpack', label: 'IT service pack', done: true },
    { id: 'jobbill', label: 'Job → invoice prefill', done: true },
    { id: 'pulse', label: 'Pulse home + chase', done: true },
  ]},
  { id: 'P1', title: 'Client-facing proof', status: 'done', items: [
    { id: 'pdfsig', label: 'Signature on PDF', done: true },
    { id: 'onboard', label: 'Onboarding checklist', done: true },
    { id: 'wa-lang', label: 'EN/AF WhatsApp templates', done: true },
    { id: 'photos', label: 'Job photos before/after', done: true },
    { id: 'portal-brand', label: 'Portal brand notes on share', done: true },
  ]},
  { id: 'P2', title: 'Daily ops lock-in', status: 'done', items: [
    { id: 'ageing', label: 'Ageing report + WA remind', done: true },
    { id: 'credit', label: 'Credit notes helper', done: true },
    { id: 'stock', label: 'Stock adjust + invoice decrement', done: true },
    { id: 'bank', label: 'Bank CSV match UI', done: true },
    { id: 'recurring', label: 'Recurring invoices', done: true },
  ]},
  { id: 'P3', title: 'Sellable B2B', status: 'done', items: [
    { id: 'audit', label: 'Local audit log', done: true },
    { id: 'tiers', label: 'License tiers Solo/Shop/Multi', done: true },
    { id: 'seats', label: 'Multi-seat roles', done: true },
    { id: 'metrics', label: 'Usage metrics', done: true },
    { id: 'branches', label: 'Multi-branch workspaces', done: true },
  ]},
  { id: 'P4', title: 'Premium platform', status: 'done', items: [
    { id: 'webhooks', label: 'Outbound webhooks', done: true },
    { id: 'api', label: 'API keys', done: true },
    { id: 'white', label: 'White-label settings', done: true },
    { id: 'sms', label: 'SMS gateway', done: true },
    { id: 'tech', label: 'Time clock · loaners · FRP checklists', done: true },
  ]},
]

export function phaseProgress() {
  let done = 0, total = 0
  for (const p of PHASES) {
    for (const i of p.items) { total++; if (i.done) done++ }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}
