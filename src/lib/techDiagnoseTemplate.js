/** Structured sections for Tech Diagnose Report (Documents generator) */
export const TECH_DIAGNOSE_TEMPLATE = {
  id: 'tech_diagnose_report',
  title: 'Tech Diagnose Report',
  category: 'Hardware',
  purpose:
    'Document structured technical diagnosis of a device, system or user-reported fault with findings, tests performed, root cause hypothesis and recommended next steps.',
  scope:
    'Capture device identity, reported symptoms, environment, reproduction steps, diagnostic tools used, test results, risk notes, data/backup status, parts/options, time spent and customer communication without recording passwords or recovery codes.',
  sections: [
    {
      heading: '1. Purpose and intended outcome',
      body:
        '[PURPOSE] This report is an operational diagnosis record for technicians and the client. It is not a warranty certificate and does not guarantee repair success without further work or parts.',
    },
    {
      heading: '2. Scope and boundaries',
      body:
        '[SCOPE] Out of scope unless listed: data recovery guarantees, third-party account recovery, illegal bypass of manufacturer locks, and work requiring specialised lab equipment not available on site.',
    },
    {
      heading: '3. Device / system identity',
      body:
        'Customer / site: [name]. Asset tag / job ref: [ref]. Make / model: [model]. Serial / IMEI: [serial]. OS / firmware: [version]. Accessories received: [list]. Reported owner of data: [name]. Backup status before diagnosis: [none / partial / verified].',
    },
    {
      heading: '4. Reported symptoms',
      body:
        'User description: [text]. When it started: [date/time]. Frequency: [constant / intermittent]. Recent changes (updates, drops, liquid, power events, new software): [list]. Business impact: [blocked / degraded / cosmetic].',
    },
    {
      heading: '5. Environment and reproduction',
      body:
        'Power source: [mains / battery / UPS]. Network: [none / Wi-Fi / LAN]. Peripherals attached: [list]. Steps to reproduce: 1) … 2) … 3) …. Result when reproduced: [observed behaviour]. Could not reproduce: [yes/no — notes].',
    },
    {
      heading: '6. Diagnostic tests performed',
      body:
        'List each test with tool, pass/fail and reading where relevant. Examples: visual inspection; POST / boot log; memory / disk health (SMART); battery health; thermal observation; malware scan (if authorised); cable / port swap; known-good parts substitution; event logs. Do not record passwords, recovery keys or full personal data extracts in this document.',
    },
    {
      heading: '7. Findings and root-cause hypothesis',
      body:
        'Confirmed findings: [list]. Most likely root cause: [hypothesis]. Alternative causes not yet ruled out: [list]. Severity: [critical / high / medium / low]. Evidence confidence: [high / medium / low].',
    },
    {
      heading: '8. Risk, data and safety notes',
      body:
        'Data-loss risk if work continues: [low/medium/high]. Liquid / electrical / physical safety notes: [list]. Warranty implications: [may void / within warranty / unknown]. Recommend full backup before repair: [yes/no].',
    },
    {
      heading: '9. Recommended next steps and options',
      body:
        'Option A (recommended): [action, parts, ETA, estimate]. Option B: [action]. Option C (replace / escalate): [action]. Parts required: [SKU/description]. Customer decision required by: [date]. Temporary workaround: [if any].',
    },
    {
      heading: '10. Time, parts and commercial',
      body:
        'Diagnostic time: [hours/minutes]. Billable diagnostic fee: [amount or included]. Quoted repair range: [amount]. Approval required before ordering parts: [yes/no]. Related quote / invoice / job numbers: [refs].',
    },
    {
      heading: '11. Customer communication',
      body:
        'Summary in plain language: [2–4 sentences]. What the customer should do next: [approve quote / collect / provide backup / monitor]. Follow-up channel: [WhatsApp / phone / email].',
    },
    {
      heading: '12. Approval and acknowledgement',
      body:
        'Technician: ____________________  Date: __________\nReviewed by (if applicable): ____________________  Date: __________\nCustomer acknowledgement of findings (not a repair authorisation unless signed as such): ____________________  Date: __________',
    },
  ],
}
