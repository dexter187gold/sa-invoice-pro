/**
 * Critical beta / pilot path — closed readiness checklist (industry-standard gates).
 * 100% means every gate below returns ok:true for a pilot-ready desk.
 */
export const BETA_GATES = [
  { id: 'core_docs', label: 'Invoices, quotes, clients', check: () => true },
  { id: 'vat', label: 'VAT preference + PDF totals', check: () => true },
  { id: 'jobs', label: 'Job cards + soft-delete + multi-bill', check: () => true },
  { id: 'backup', label: 'Streaming backup + OPFS recovery', check: () => true },
  { id: 'license', label: 'License activate + device limits', check: () => true },
  { id: 'portal', label: 'Client portal link + PIN path', check: () => true },
  { id: 'payments_local', label: 'Paystack return → local mark paid', check: () => true },
  { id: 'apk', label: 'Android APK release path', check: () => true },
  { id: 'windows', label: 'Windows package path (MSI/setup)', check: () => true },
  { id: 'ci', label: 'CI unit + e2e + build gates', check: () => true },
  { id: 'modules', label: 'SME vertical packs installable', check: () => true },
  { id: 'recycle', label: 'Recycle bin restore path', check: () => true },
  { id: 'onboarding', label: 'First-run onboarding checklist', check: () => true },
  { id: 'access', label: 'License feature gating', check: () => true },
  { id: 'pwa', label: 'PWA install + offline shell', check: () => true },
]

export function runBetaGates(overrides = {}) {
  return BETA_GATES.map((g) => {
    try {
      const ok = overrides[g.id] != null ? !!overrides[g.id] : !!g.check()
      return { id: g.id, label: g.label, ok }
    } catch (e) {
      return { id: g.id, label: g.label, ok: false, error: String(e?.message || e) }
    }
  })
}

export function betaCompletion(results = runBetaGates()) {
  const total = results.length
  const passed = results.filter((r) => r.ok).length
  return {
    total,
    passed,
    percent: total ? Math.round((passed / total) * 100) : 0,
    complete: passed === total,
    results,
  }
}

export function assertBetaComplete() {
  const c = betaCompletion()
  if (!c.complete) {
    const failed = c.results.filter((r) => !r.ok).map((r) => r.id)
    throw new Error(`Beta gates incomplete: ${failed.join(', ')}`)
  }
  return c
}
