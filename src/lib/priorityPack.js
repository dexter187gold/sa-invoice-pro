/**
 * World Domination priority pack — closed outcome list.
 * 100% = every outcome status is "done".
 */
export const PRIORITY_OUTCOMES = [
  { id: 'streaming_import', pillar: 'D', label: 'Streaming JSON backup import', status: 'done' },
  { id: 'chunked_snapshots', pillar: 'D', label: 'Chunked OPFS recovery snapshots', status: 'done' },
  { id: 'staged_restore', pillar: 'D', label: 'Staged restore invariants', status: 'done' },
  { id: 'soft_delete', pillar: 'D', label: 'Soft-delete + recycle bin', status: 'done' },
  { id: 'placeholder_ban', pillar: 'D', label: 'CI placeholder / zero-byte ban', status: 'done' },
  { id: 'vat_persist', pillar: 'B', label: 'VAT preference across desk + PDF', status: 'done' },
  { id: 'job_desk', pillar: 'B', label: 'Job desk kanban + detail + Snipe', status: 'done' },
  { id: 'multi_job_bill', pillar: 'B', label: 'Multi job-card → one invoice', status: 'done' },
  { id: 'attachments_opfs', pillar: 'B', label: 'Attachments / OPFS media path', status: 'done' },
  { id: 'layout_toggle', pillar: 'B', label: 'Modern / traditional layout toggle', status: 'done' },
  { id: 'company_logo', pillar: 'B', label: 'Company logo on PDF', status: 'done' },
  { id: 'onboarding', pillar: 'B', label: 'Onboarding checklist', status: 'done' },
  { id: 'license_devices', pillar: 'C', label: 'Plan device limits + isolation', status: 'done' },
  { id: 'license_revoke_ui', pillar: 'C', label: 'Admin revoke consistency', status: 'done' },
  { id: 'portal_pin', pillar: 'B', label: 'Portal username + PIN generation', status: 'done' },
  { id: 'magic_link', pillar: 'B', label: 'Portal magic link issue path', status: 'done' },
  { id: 'owner_gating', pillar: 'C', label: 'Owner/dev portal route gating', status: 'done' },
  { id: 'paystack_return', pillar: 'A', label: 'Paystack return local mark-paid + deep-link', status: 'done' },
  { id: 'desk_money', pillar: 'A', label: 'ZAR/VAT/allocation helpers', status: 'done' },
  { id: 'desk_reports', pillar: 'A', label: 'Reporting aggregate helpers', status: 'done' },
  { id: 'apk_release', pillar: 'D', label: 'Android APK CI + release artifacts', status: 'done' },
  { id: 'windows_msi', pillar: 'D', label: 'Windows Tauri MSI/setup path', status: 'done' },
  { id: 'pwa', pillar: 'D', label: 'PWA register + offline shell', status: 'done' },
  { id: 'e2e_ci', pillar: 'D', label: 'Playwright e2e + unit in CI', status: 'done' },
  { id: 'vertical_registry', pillar: 'B', label: 'All SME verticals stable in registry', status: 'done' },
  { id: 'catalog_install', pillar: 'B', label: 'One-click catalog packs per type', status: 'done' },
  { id: 'it_templates', pillar: 'B', label: 'IT 64+ document templates', status: 'done' },
  { id: 'feature_flags', pillar: 'C', label: 'Feature flag defaults', status: 'done' },
  { id: 'beta_gates', pillar: 'D', label: 'Beta readiness gate module', status: 'done' },
  { id: 'module_score', pillar: 'B', label: 'SME completeness scorer', status: 'done' },
  { id: 'desk_guards', pillar: 'C', label: 'Security/privacy desk guards', status: 'done' },
  { id: 'desk_sync', pillar: 'A', label: 'Offline queue / sync helpers', status: 'done' },
  { id: 'notifications', pillar: 'B', label: 'In-app bell notification helpers', status: 'done' },
  { id: 'search', pillar: 'B', label: 'Global search helpers', status: 'done' },
  { id: 'calendar', pillar: 'B', label: 'Due-date / SLA calendar helpers', status: 'done' },
]

export function priorityPackCompletion() {
  const total = PRIORITY_OUTCOMES.length
  const done = PRIORITY_OUTCOMES.filter((o) => o.status === 'done').length
  const byPillar = {}
  for (const o of PRIORITY_OUTCOMES) {
    if (!byPillar[o.pillar]) byPillar[o.pillar] = { total: 0, done: 0 }
    byPillar[o.pillar].total++
    if (o.status === 'done') byPillar[o.pillar].done++
  }
  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: done === total,
    byPillar,
    outcomes: PRIORITY_OUTCOMES,
  }
}

export function openPriorityOutcomes() {
  return PRIORITY_OUTCOMES.filter((o) => o.status !== 'done')
}
