export const TIERS = [
  {
    id: 'solo',
    name: 'Solo',
    priceHint: '1 device · owner-operator',
    seats: 1,
    features: [
      'Invoices, jobs, WhatsApp, portal',
      'Offline + cloud restore',
      'IT service pack',
      'Themes + Pulse home',
    ],
  },
  {
    id: 'shop',
    name: 'Shop',
    priceHint: 'Up to 5 seats · front desk + techs',
    seats: 5,
    features: [
      'Everything in Solo',
      'Audit log',
      'Ageing reports + bulk chase',
      'Recurring + retainers',
      'Priority license support',
    ],
    recommended: true,
  },
  {
    id: 'multi',
    name: 'Multi-branch',
    priceHint: 'Branches · white-label ready',
    seats: 25,
    features: [
      'Everything in Shop',
      'Per-branch workspaces (roadmap)',
      'API / webhooks (roadmap)',
      'Custom domain portal',
      'SLA on license server',
    ],
  },
]
