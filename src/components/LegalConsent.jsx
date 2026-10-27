import React, { useEffect, useState } from 'react'

const KEY = 'saip_cookie_consent_v1'
const POLICY_VERSION = '2026-10-28'

export const PRIVACY_SUMMARY = [
  ['Who is responsible?', 'The business operating this SA Invoice Pro workspace is responsible for the personal information it enters. The service operator and any hosting/sync providers may process information to provide the app. Complete the operator/contact details in Settings before relying on this notice as a published legal notice.'],
  ['What information may be processed?', 'Account and company details; client and supplier contact details; invoices, quotes, job cards, payments, expenses, documents and audit/support details; device, diagnostic and sync metadata. Do not enter information you do not have authority to process.'],
  ['Why is it processed?', 'To provide invoicing, bookkeeping, job management, cloud sync, account security, support, backups and requested integrations; to meet legal obligations; and to investigate abuse or service failures. Marketing must be separately and lawfully authorised.'],
  ['POPIA principles and lawful basis', 'The responsible party should document a lawful basis, give appropriate notice, collect only what is necessary, keep information accurate, secure it, limit retention and support data-subject rights under the Protection of Personal Information Act 4 of 2013 (POPIA). Contract performance, legal obligations and legitimate interests may apply depending on the processing; consent is not assumed to be the lawful basis for every operation.'],
  ['Hosting, sync and operators', 'This app uses browser storage and may use the SAIP sync service hosted separately. Information sent to cloud services is subject to the relevant provider infrastructure and configured service. Review provider contracts, security controls, sub-processors and any cross-border transfers before enabling cloud sync for sensitive data.'],\n  ['Cloud AI assistant', 'If you sign in and use the Cloud AI assistant, the question you submit is sent to Cloudflare Workers AI to generate an answer. The app does not automatically attach invoices, customer records, bank details or other workspace data. Do not include personal, confidential or banking information in your question. Cloudflare states that standard Workers AI inference inputs and outputs are not retained after processing and are not used to train AI models; limited operational metadata may be retained for service operation, security and billing. Review Cloudflare’s current data-usage terms at https://developers.cloudflare.com/workers-ai/platform/data-usage/. Local help remains available without sending a prompt to the cloud.'],
  ['Retention and security', 'Local data remains on the device until deleted or the browser storage is cleared; cloud retention depends on the service and account configuration. Use strong unique credentials, restrict staff access, protect devices and keep backups secure. No online system can promise absolute security.'],
  ['Your rights and requests', 'Subject to POPIA and other applicable law, data subjects may request access, correction or deletion, object to certain processing, withdraw consent where consent is the basis, and complain to the Information Regulator. The responsible business must verify identity and respond within applicable legal timeframes. Privacy and data requests: sainvoicepro@gmail.com. The operator must still verify and publish its legal entity name, physical address and Information Officer details before relying on this notice as a complete compliance document.'],
  ['Children and special personal information', 'This business tool is not designed for children. Avoid entering children’s information or special personal information unless a lawful basis and any required authorisation and safeguards have been established.'],
  ['Changes and incidents', 'This notice should be reviewed when features, providers or purposes change. If a security compromise may have exposed personal information, the responsible party must assess and meet POPIA notification duties where required.']
]

export const TERMS_SUMMARY = [
  ['Service and account', 'SA Invoice Pro is a business administration tool. You are responsible for account security, user permissions, company details and ensuring that information entered is accurate and lawful. You must be authorised to act for the business and to submit any data entered.'],
  ['Customer data and intellectual property', 'You retain rights in your business records and content. You grant the service only the limited permission needed to host, sync, display, back up and process that content to provide the features you use. The app, its branding and software remain the property of their respective rights holders. Do not copy, reverse engineer or redistribute protected components except where the law permits.'],
  ['Licences, fees and cancellation', 'If you purchase a licence or paid plan, the price, term, renewal, included features and cancellation rules shown at purchase apply. Keep your receipt and verify renewal dates. Refunds and statutory consumer rights are governed by applicable South African law and any clearly disclosed purchase terms; no term here removes non-excludable rights.'],
  ['Suspension and termination', 'Access may be restricted where reasonably necessary to protect the service, investigate abuse, comply with law or address non-payment under the applicable plan. Where practicable, notice and an opportunity to remedy will be provided. Export your records before ending use; any retention or deletion must remain subject to applicable law and the privacy notice.'],
  ['Invoices, tax and records', 'You remain responsible for compliance with South African tax, VAT, invoicing, employment, accounting and record-retention requirements. App calculations and generated documents are tools, not tax, legal or accounting advice. Verify every invoice, VAT treatment, payroll result and statutory filing before relying on it.'],
  ['Data and backups', 'Keep independent backups and verify restore procedures. Offline browser data may be lost through device failure, browser cleanup or profile changes. Cloud sync may be delayed or unavailable. Do not treat sync indicators as proof that a separate backup exists.'],
  ['Acceptable use', 'Do not misuse the service, attempt unauthorised access, upload unlawful content, infringe others’ rights or use the app to conceal fraud. You must have authority to process the personal information you enter.'],
  ['Third-party services', 'Cloud hosting, sync, payment, messaging, AI and other integrations may have separate terms, availability limits and privacy practices. The Cloud AI assistant sends only the current question for inference and does not automatically send workspace records. Do not send confidential data to an integration until you have reviewed and enabled it intentionally.'],
  ['Availability and changes', 'Features may change, be interrupted for maintenance or depend on third-party providers. Keep local exports and do not rely on the service as the sole copy of critical records.'],
  ['Liability and disputes', 'To the extent permitted by applicable law, the service is provided without a guarantee that it is error-free or suitable for every statutory use. Nothing in these terms excludes rights or liability that cannot lawfully be excluded under South African law. Resolve disputes under applicable South African law and competent courts.'],
  ['Contact and updates', 'For support and privacy requests, email sainvoicepro@gmail.com. The brand name is SA Invoice Pro; its legal entity name and physical address must be verified by the operator before publication. These terms take effect when published and may be updated with a revised date.']
]

function readConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    return value?.version === POLICY_VERSION ? value : null
  } catch { return null }
}
function saveConsent(value) {
  const record = { ...value, version: POLICY_VERSION, savedAt: new Date().toISOString() }
  try { localStorage.setItem(KEY, JSON.stringify(record)) } catch {}
  return record
}

export default function LegalConsent() {
  const [consent, setConsent] = useState(() => readConsent())
  const [panel, setPanel] = useState('')
  const [analytics, setAnalytics] = useState(() => !!readConsent()?.analytics)

  useEffect(() => {
    const onOpen = (e) => setPanel(e.detail || 'privacy')
    window.addEventListener('saip-open-legal', onOpen)
    return () => window.removeEventListener('saip-open-legal', onOpen)
  }, [])

  const choose = (all) => {
    const next = saveConsent({ essential: true, analytics: !!all && analytics, preferences: !!all && analytics, decision: all ? 'accepted-selected' : 'essential-only' })
    setConsent(next)
    setPanel('')
  }

  return (
    <>
      {!consent ? (
        <section className="cookie-consent" role="dialog" aria-label="Privacy and cookie choices" aria-live="polite">
          <div className="cookie-consent-copy">
            <strong>Your privacy matters</strong>
            <p>SA Invoice Pro uses essential browser storage to keep the app working. Optional analytics are not active in this build; saving a preference does not enable trackers. Read our <button type="button" className="legal-inline-link" onClick={() => setPanel('privacy')}>Privacy & POPIA notice</button> and <button type="button" className="legal-inline-link" onClick={() => setPanel('terms')}>Terms</button>.</p>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPanel('preferences')}>Preferences</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => choose(false)}>Essential only</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setAnalytics(true); const next = saveConsent({ essential: true, analytics: true, preferences: true, decision: 'accepted-all' }); setConsent(next) }}>Accept all</button>
          </div>
        </section>
      ) : (
        <button type="button" className="privacy-reopen" onClick={() => setPanel('preferences')} aria-label="Privacy and cookie settings">Privacy</button>
      )}
      {panel ? (
        <div className="legal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setPanel('') }}>
          <section className="legal-panel" role="dialog" aria-modal="true" aria-label={panel === 'terms' ? 'Terms and conditions' : panel === 'privacy' ? 'Privacy and POPIA notice' : 'Privacy preferences'}>
            <div className="legal-panel-head">
              <div><span className="muted">SA INVOICE PRO · Updated {POLICY_VERSION}</span><h2>{panel === 'terms' ? 'Terms and Conditions' : panel === 'privacy' ? 'Privacy & POPIA Notice' : 'Privacy preferences'}</h2></div>
              <button className="btn btn-outline btn-sm" onClick={() => setPanel('')} type="button">Close</button>
            </div>
            {panel === 'preferences' ? (
              <div className="legal-section">
                <p><strong>Essential storage</strong> — always enabled. Required for sign-in, security, app preferences and local business records.</p>
                <label className="legal-toggle"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Optional analytics and preferences</label>
                <p className="muted">Optional analytics are not currently activated by this consent component. Enabling this preference records your choice; it does not by itself install analytics trackers.</p>
                <div className="cookie-consent-actions"><button className="btn btn-outline" onClick={() => choose(false)}>Save essential only</button><button className="btn btn-primary" onClick={() => { const next = saveConsent({ essential: true, analytics, preferences: analytics, decision: 'saved-preferences' }); setConsent(next); setPanel('') }}>Save preferences</button></div>
              </div>
            ) : (
              <div className="legal-document">
                <p className="legal-disclaimer">Plain-language product notice, not a substitute for legal advice. The responsible business must verify its legal entity identity, physical address, Information Officer details, processing purposes, provider contracts, retention periods and operational practices before publication.</p>
                {(panel === 'terms' ? TERMS_SUMMARY : PRIVACY_SUMMARY).map(([heading, body]) => <section className="legal-section" key={heading}><h3>{heading}</h3><p>{body}</p></section>)}
                {panel === 'privacy' ? <p>For requests or complaints, contact the responsible business using the verified contact details it publishes in Settings or on its official website. Do not rely on this notice until those details are completed.</p> : null}
                <button type="button" className="btn btn-primary" onClick={() => setPanel('')}>Close notice</button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}

export function openLegal(panel = 'privacy') {
  window.dispatchEvent(new CustomEvent('saip-open-legal', { detail: panel }))
}
