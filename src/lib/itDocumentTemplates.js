/** IT Business Document Studio — template catalogue with Tech Diagnose Report.
 * Detailed operational drafts. Legal/security decisions require owner review.
 */
import { TECH_DIAGNOSE_TEMPLATE } from './techDiagnoseTemplate.js'

const raw = [
  ["it_assessment","IT Assessment & Discovery","Governance","Assess the current technology estate and document risks, priorities and recommended investment.","Inventory users, devices, applications, network dependencies, business-critical services, support arrangements and known pain points."],
  ["it_audit","IT Systems Audit Report","Governance","Record evidence-based findings from a defined IT audit.","Define audit scope, evidence sources, sampling approach, exclusions, severity ratings and remediation owners."],
  ["troubleshooting","IT Troubleshooting & Diagnostic Report","Support","Record diagnostic work and explain the evidence behind a resolution.","Capture symptoms, environment, checks, logs reviewed, root cause confidence, actions, outcome, remaining risks and prevention."],
  ["device_repair","Device Repair Intake & Authorisation","Hardware","Record condition, fault symptoms and approval before repair.","Capture device identifiers, visible condition, accessories, password-safe access method, backup acknowledgement, estimate limit and diagnostic consent."],
  ["tech_diagnose_report","Tech Diagnose Report","Hardware","Document structured technical diagnosis of a device, system or user-reported fault with findings, tests performed, root cause hypothesis and recommended next steps.","Capture device identity, reported symptoms, environment, reproduction steps, diagnostic tools used, test results, risk notes, data/backup status, parts/options, time spent and customer communication without recording passwords or recovery codes."],
  ["data_recovery","Data Recovery Authorisation & Chain of Custody","Hardware","Authorise data recovery while preserving evidence and privacy.","Record media condition, custody transfers, write-protection, scope, success criteria, storage destination, confidentiality and limitations."],
  ["service_report","Monthly Managed IT Service Report","Support","Report service performance and improvement opportunities.","Summarise tickets, response/resolution trends, recurring incidents, patch/backups status, risks, asset changes and next-month actions."],
  ["client_handover","IT Service Handover & Acceptance","Delivery","Confirm deliverables, knowledge transfer and operational ownership.","List delivered items, credentials transfer method, documentation, known issues, training, support contacts, acceptance and exceptions."],
  ["incident_report","Security Incident Report","Security","Capture a single incident in a defensible, factual record.","Record timeline, affected assets/data, indicators, impact, containment, evidence references, notifications assessed and corrective actions."],
  ["backup_policy","Backup & Restore Policy","Resilience","Define what must be backed up and how recovery is proven.","Specify data scope, frequency, retention, encryption, immutability, off-site copies, owners, restore testing and RPO/RTO."],
]

const categoryLabels = {
  Governance: 'Governance & strategy',
  Assets: 'Assets & lifecycle',
  Identity: 'Identity & access',
  Security: 'Security & privacy',
  Resilience: 'Backup & continuity',
  Change: 'Change & release',
  Infrastructure: 'Infrastructure & network',
  Cloud: 'Cloud & hosting',
  Web: 'Websites',
  Delivery: 'Software delivery',
  Quality: 'Testing & quality',
  Integration: 'APIs & integration',
  Data: 'Data management',
  Privacy: 'Privacy & POPIA',
  Supplier: 'Supplier management',
  Support: 'IT support',
  Hardware: 'Hardware & repair',
  Field: 'Field services',
  Project: 'Project management',
  Operations: 'Operations',
  People: 'People & training',
}

function sectionsFor([id, title, category, purpose, scope]) {
  if (id === 'tech_diagnose_report') {
    return (TECH_DIAGNOSE_TEMPLATE.sections || []).map((s) => ({
      heading: s.heading,
      body: String(s.body || '')
        .replaceAll('[PURPOSE]', purpose)
        .replaceAll('[SCOPE]', scope),
    }))
  }
  const safeguards =
    'Nominate an accountable owner, record evidence, and review when risk or scope changes. Never store passwords or recovery codes in this document.'
  return [
    { heading: '1. Purpose and intended outcome', body: purpose },
    { heading: '2. Scope and boundaries', body: scope },
    { heading: '3. Roles and responsibilities', body: safeguards },
    {
      heading: '4. Procedure / findings',
      body: 'Document steps taken, evidence reviewed, decisions made and exceptions. Link related job, quote or invoice numbers where applicable.',
    },
    {
      heading: '5. Risks, controls and next actions',
      body: 'List residual risks, compensating controls, owners and due dates. Escalate blockers through the approved channel.',
    },
    {
      heading: '6. Approval and acknowledgement',
      body: 'Prepared by: ____________________  Date: __________\nApproved by: ____________________  Date: __________\nCustomer acknowledgement (if applicable): ____________________  Date: __________',
    },
  ]
}

export const IT_DOCUMENT_TEMPLATES = raw.map(([id, title, category, purpose, scope]) => ({
  id,
  title,
  category,
  categoryLabel: categoryLabels[category] || category,
  purpose,
  scope,
  tags: [
    category.toLowerCase(),
    ...title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((x) => x.length > 3)
      .slice(0, 5),
  ],
  sections: sectionsFor([id, title, category, purpose, scope]),
}))

export function getITDocumentTemplate(id) {
  return IT_DOCUMENT_TEMPLATES.find((item) => item.id === id) || IT_DOCUMENT_TEMPLATES[0]
}

export function searchITDocumentTemplates(query, category = 'all') {
  const q = String(query || '').trim().toLowerCase()
  return IT_DOCUMENT_TEMPLATES.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      (!q ||
        [item.title, item.purpose, item.scope, item.categoryLabel, ...item.tags]
          .join(' ')
          .toLowerCase()
          .includes(q)),
  )
}
