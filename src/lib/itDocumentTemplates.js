/** IT Business Document Studio — 60+ operational templates for SA workshops.
 * Detailed drafts for customer-ready send. Owner still reviews legal/security final wording.
 */
import { TECH_DIAGNOSE_TEMPLATE } from './techDiagnoseTemplate.js'

const raw = [
  ["it_assessment","IT Assessment & Discovery","Governance","Assess the current technology estate and document risks, priorities and recommended investment.","Inventory users, devices, applications, network dependencies, business-critical services, support arrangements and known pain points."],
  ["it_audit","IT Systems Audit Report","Governance","Record evidence-based findings from a defined IT audit.","Define audit scope, evidence sources, sampling approach, exclusions, severity ratings and remediation owners."],
  ["it_strategy","IT Strategy & Roadmap","Governance","Align technology investment with business goals over a 12–36 month horizon.","Capture current state, target state, budget bands, dependencies, risks and quarterly milestones."],
  ["change_control","Change Control Record","Governance","Authorise and track planned changes to production systems.","Describe change, impact, rollback, test evidence, approvers and implementation window."],
  ["risk_register","IT Risk Register Extract","Governance","Document material technology risks and treatment plans.","Risk description, likelihood, impact, residual risk, owner, treatment and review date."],
  ["vendor_review","Vendor / Supplier Review","Governance","Evaluate a technology supplier against service, security and commercial expectations.","Contract terms, SLA performance, support quality, pricing, exit options and recommendation."],
  ["budget_proposal","IT Budget Proposal","Governance","Propose capital and operational IT spend with business justification.","Line items, one-time vs recurring, ROI or risk reduction, alternatives and approval request."],
  ["asset_register","IT Asset Register Snapshot","Governance","Snapshot of hardware and software assets under management.","Asset ID, type, user/location, purchase/warranty dates, status and notes."],
  ["raci_matrix","IT Roles RACI Matrix","Governance","Clarify who is Responsible, Accountable, Consulted and Informed for key IT processes.","List processes (backup, incidents, changes, onboarding) and role assignments."],
  ["board_it_brief","Board / Owner IT Brief","Governance","Executive summary of IT health for owners or board.","Uptime, major incidents, projects, spend vs budget, top risks and decisions required."],
  ["device_repair","Device Repair Intake & Authorisation","Hardware","Record condition, fault symptoms and approval before repair.","Device identifiers, visible condition, accessories, access method, backup acknowledgement, estimate limit and diagnostic consent."],
  ["tech_diagnose_report","Tech Diagnose Report","Hardware","Structured technical diagnosis with findings, tests, root cause hypothesis and next steps.","Device identity, symptoms, environment, reproduction, tools, results, risk, data/backup, parts/options and communication."],
  ["data_recovery","Data Recovery Authorisation & Chain of Custody","Hardware","Authorise data recovery while preserving evidence and privacy.","Media condition, custody transfers, write-protection, scope, success criteria, storage destination and limitations."],
  ["hardware_quote_pack","Hardware Quote Pack Notes","Hardware","Supporting notes for a hardware supply or upgrade quote.","Recommended models, compatibility, warranty, alternatives and installation assumptions."],
  ["loaner_agreement","Loaner Device Agreement","Hardware","Track temporary replacement equipment issued to a customer.","Device details, condition photos/notes, return date, liability and deposit if any."],
  ["warranty_claim","Warranty Claim Report","Hardware","Support a manufacturer or supplier warranty claim.","Purchase proof, serial, failure description, prior repairs, shipping and claim status."],
  ["parts_order","Parts Order & Fitment Record","Hardware","Record ordered parts and successful fitment.","Part numbers, supplier, cost, fitment date, tests after install and residual issues."],
  ["decommission","Device Decommission Checklist","Hardware","Retire a device securely from the estate.","Data wipe method, asset tag retirement, disposal/recycle certificate and user confirmation."],
  ["pos_terminal_check","POS / Terminal Health Check","Hardware","Verify point-of-sale or payment terminal readiness.","Power, network, software version, peripheral tests, last settlement and issues."],
  ["printer_setup","Printer & Scan Setup Report","Hardware","Document printer/scanner installation and user handover.","Model, connection type, drivers, default settings, test page and known limitations."],
  ["troubleshooting","IT Troubleshooting & Diagnostic Report","Support","Record diagnostic work and explain the evidence behind a resolution.","Symptoms, environment, checks, logs, root cause confidence, actions, outcome and prevention."],
  ["service_report","Monthly Managed IT Service Report","Support","Report service performance and improvement opportunities.","Tickets, response/resolution trends, recurring incidents, patch/backups, risks and next-month actions."],
  ["incident_report","Incident Report","Support","Formal record of a service-affecting incident.","Timeline, impact, detection, containment, eradication, recovery, root cause and follow-ups."],
  ["remote_session","Remote Support Session Log","Support","Log remote assistance provided to a user or site.","Start/end time, tools used, consent, actions, outcome and residual advice."],
  ["onsite_visit","On-site Visit Report","Support","Summarise work performed during a site visit.","Arrival/departure, contacts met, tasks, findings, photos/refs, parts used and next visit needs."],
  ["ticket_closure","Ticket Closure Summary","Support","Customer-facing closure note for a completed job.","Issue summary, work done, result, advice, related invoice/quote and satisfaction ask."],
  ["escalation_pack","Escalation Pack","Support","Package context for higher-tier or vendor escalation.","Symptom timeline, already tried, logs/screenshots, urgency, business impact and contacts."],
  ["knowledge_article","Internal Knowledge Article","Support","Capture a reusable fix for the team knowledge base.","Problem signature, environment, steps, caveats and related tickets."],
  ["sla_breach","SLA Breach Review","Support","Analyse a missed response or resolution target.","SLA definition, actual times, cause, customer impact, credit if any and process change."],
  ["after_hours","After-Hours Call Log","Support","Record emergency or after-hours support activity.","Caller, urgency, actions, time spent, billable status and follow-up for business hours."],
  ["network_assessment","Network Assessment Report","Network","Evaluate LAN/WAN/Wi-Fi fitness for business needs.","Topology, equipment, coverage, congestion, security posture and recommendations."],
  ["wifi_survey","Wi-Fi Survey Notes","Network","Document wireless coverage and interference findings.","Floors/areas tested, signal strength, SSIDs, channel plan and dead zones."],
  ["firewall_change","Firewall / Rule Change Record","Network","Authorise and document firewall or edge rule changes.","Rule intent, source/destination, ports, risk, approver, implementer and verification."],
  ["vpn_setup","VPN Setup & Handover","Network","Document VPN access configuration for a user or site.","Client type, authentication, split tunnel notes, test results and support contacts."],
  ["isp_outage","ISP / Link Outage Report","Network","Record ISP or circuit outage and resolution path.","Circuit IDs, outage window, ISP ticket, impact, workaround and permanent fix."],
  ["switch_port_map","Switch Port & Patch Map","Network","Map physical ports to devices and services.","Switch name, port, VLAN, connected device, cable ID and notes."],
  ["dns_dhcp","DNS / DHCP Configuration Snapshot","Network","Snapshot critical name and address services.","Scopes, reservations, forwarders, zones and recent changes."],
  ["network_handover","Network Project Handover","Network","Hand over a completed network project to operations.","As-built notes, credentials location (not values), diagrams, support contacts and open items."],
  ["security_assessment","Security Assessment Summary","Security","High-level security posture review for an SME site.","Identity, endpoints, email, backups, perimeter, findings and priority actions."],
  ["popia_checklist","POPIA / Privacy IT Checklist","Security","IT controls checklist relevant to South African POPIA obligations.","Access control, retention, breach readiness, processor agreements and training notes."],
  ["access_review","User Access Review","Security","Periodic review of who can access systems and data.","Users reviewed, privileges, joiners/leavers, exceptions and sign-off."],
  ["password_policy","Password & MFA Policy Acknowledgement","Security","Confirm staff understanding of authentication standards.","Policy summary, MFA requirement, exceptions and signed acknowledgement."],
  ["malware_incident","Malware / Ransomware Response Log","Security","Document containment and recovery from malware events.","Detection, isolation, eradication, restore source, residual risk and lessons."],
  ["backup_policy","Backup & Recovery Policy Summary","Security","Define what is backed up, how often, and recovery expectations.","Systems in scope, frequency, retention, offsite/cloud, test restores and owners."],
  ["restore_test","Backup Restore Test Record","Security","Evidence that backups can actually be restored.","System tested, method, duration, success criteria, issues and next test date."],
  ["security_awareness","Security Awareness Brief","Security","Short brief for staff on current threats and safe behaviour.","Topics covered, attendance, phishing tips and reporting channel."],
  ["vulnerability_scan","Vulnerability Scan Follow-up","Security","Track remediation of scan findings.","Scan date, critical/high items, owners, deadlines and verification."],
  ["usb_media","Removable Media Control Note","Security","Policy and incident notes for USB and external drives.","Allowed use, encryption expectation, exceptions and observed violations."],
  ["m365_tenant","Microsoft 365 Tenant Health Check","Cloud","Review M365 security and collaboration basics.","Licences, MFA, sharing, external access, backup of M365 data and admin roles."],
  ["google_workspace","Google Workspace Health Check","Cloud","Review Google Workspace configuration for an SME.","Users, 2SV, sharing, Drive retention, admin roles and integrations."],
  ["cloud_backup","Cloud Backup Configuration Report","Cloud","Document cloud backup product setup and coverage.","Workloads protected, schedules, retention, alerts and last successful job."],
  ["saas_onboarding","SaaS Application Onboarding","Cloud","Bring a new SaaS app into the business safely.","Owner, data classification, SSO/MFA, offboarding and cost centre."],
  ["email_migration","Email Migration Runbook Result","Cloud","Record results of a mailbox or tenant migration.","Source/target, cutover window, failures, DNS changes and user comms."],
  ["domain_dns","Domain & DNS Change Record","Cloud","Track domain registrar and DNS changes.","Domain, records changed, TTL, purpose, verifier and rollback."],
  ["client_handover","IT Service Handover & Acceptance","Delivery","Confirm deliverables, knowledge transfer and acceptance.","Deliverables list, training done, open issues, acceptance signature and support path."],
  ["project_closeout","Project Close-out Report","Delivery","Close an IT project with outcomes and lessons.","Objectives vs results, budget, timeline, residual risks and recommendations."],
  ["sow_summary","Statement of Work Summary","Delivery","Customer-facing summary of agreed work package.","Scope in/out, assumptions, timeline, fees, change process and contacts."],
  ["go_live","Go-Live Checklist","Delivery","Verify readiness before switching users to a new system.","Data, training, support roster, rollback, comms and sign-off."],
  ["training_attendance","End-User Training Attendance","Delivery","Record who attended system training.","Course, date, attendees, materials and follow-up coaching needs."],
  ["staff_onboarding_it","Staff IT Onboarding Checklist","People","Provision accounts, devices and access for a new joiner.","Identity, email, device, apps, MFA, policy acknowledgement and buddy."],
  ["staff_offboarding_it","Staff IT Offboarding Checklist","People","Revoke access and recover assets when someone leaves.","Account disable, MFA revoke, data transfer, device return and mailbox disposition."],
  ["acceptable_use","Acceptable Use Policy Acknowledgement","People","Staff sign-off on acceptable use of company systems.","Policy version, key rules summary, signature and date."],
  ["byod","BYOD Registration","People","Register personal devices used for work.","Device type, OS, owner, security requirements and approval."],
  ["skills_matrix","Team Skills Matrix Snapshot","People","Map technician skills for roster and training planning.","People, skill areas, proficiency, gaps and training plan."],
]

const categoryLabels = {
  Governance: 'Governance & strategy',
  Hardware: 'Hardware & devices',
  Support: 'Support & service desk',
  Network: 'Network & connectivity',
  Security: 'Security & compliance',
  Cloud: 'Cloud & identity',
  Delivery: 'Delivery & projects',
  People: 'People & training',
}

function defaultSections(purpose, scope, title) {
  return [
    { heading: '1. Document control', body: 'Title: ' + title + '\nVersion: 1.0\nStatus: Draft for customer / internal use\nPrepared for: ____________________\nPrepared by: ____________________\nDate: __________\nRelated job / quote / invoice: ____________________' },
    { heading: '2. Purpose and intended outcome', body: purpose },
    { heading: '3. Scope and boundaries', body: scope + '\n\nOut of scope: items not listed above unless agreed in writing.' },
    { heading: '4. Environment & parties', body: 'Customer / site: ____________________\nPrimary contact: ____________________\nPhone / email: ____________________\nLocation / branch: ____________________\nSystems / sites covered: ____________________\nTechnician(s): ____________________' },
    { heading: '5. Findings / procedure', body: 'Record chronological steps, tools used, evidence reviewed (ticket IDs, screenshots stored separately), measurements and decisions. Note any customer-approved deviations from standard procedure.' },
    { heading: '6. Evidence & references', body: 'Attach or reference: photos, logs (paths only — no secrets), vendor tickets, prior reports. Do not paste passwords, recovery codes, full card numbers or identity documents into this file.' },
    { heading: '7. Risks, residual issues & recommendations', body: 'List residual risks, recommended next actions, owners and target dates. Distinguish must-fix vs optional improvements with rough effort where known.' },
    { heading: '8. Commercial / follow-up links', body: 'Quote / invoice numbers: ____________________\nWarranty notes: ____________________\nScheduled follow-up: ____________________\nParts on order: ____________________' },
    { heading: '9. Approval and acknowledgement', body: 'Prepared by: ____________________  Date: __________\nReviewed by: ____________________  Date: __________\nCustomer acknowledgement (if applicable): ____________________  Date: __________\n\nSafeguard: nominate an accountable owner, store evidence securely, and review when risk or scope changes.' },
  ]
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
  const base = defaultSections(purpose, scope, title)
  const extra = {
    Security: { heading: '5b. Security-specific controls', body: 'Access changes made: ____________________\nMFA / identity impact: ____________________\nData classification touched: ____________________\nBreach / POPIA notification assessment: Not required / Under review / Escalated' },
    Network: { heading: '5b. Network-specific notes', body: 'Diagrams / port maps updated: Yes / No\nIP / VLAN changes: ____________________\nDowntime window used: ____________________\nVerification tests (ping, speed, failover): ____________________' },
    Hardware: { heading: '5b. Hardware-specific notes', body: 'Serial / asset tag: ____________________\nWarranty status: ____________________\nParts fitted: ____________________\nPost-repair test results: ____________________\nData backup before work: Confirmed / Declined / N/A' },
    Cloud: { heading: '5b. Cloud-specific notes', body: 'Tenant / subscription: ____________________\nAdmin roles involved: ____________________\nLicence impact: ____________________\nRollback plan: ____________________' },
    Support: { heading: '5b. Service desk metrics', body: 'Ticket priority: ____________________\nResponse time: ____________________\nResolution time: ____________________\nCustomer impact (users / revenue): ____________________' },
    Governance: { heading: '5b. Decision log', body: 'Options considered: ____________________\nDecision: ____________________\nDecision maker: ____________________\nReview date: ____________________' },
    Delivery: { heading: '5b. Acceptance criteria', body: 'Criteria agreed: ____________________\nMet / partial / deferred: ____________________\nOutstanding snags: ____________________' },
    People: { heading: '5b. People & access checklist', body: 'Accounts created/disabled: ____________________\nDevices issued/returned: ____________________\nPolicy acknowledgement collected: Yes / No / Pending' },
  }
  if (extra[category]) {
    return base.slice(0, 5).concat([extra[category]], base.slice(5))
  }
  return base
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
      .slice(0, 6),
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
