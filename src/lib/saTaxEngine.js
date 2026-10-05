/**
 * SA Invoice Pro — Proudly SA Tax / Payroll Engine (client-side estimate)
 * Tax year 2026/27 (1 Mar 2026 – 28 Feb 2027) tables.
 * NOT a substitute for SARS e@syFile / professional advice.
 * All money handled in cents (integers) to avoid float drift.
 */

const UIF_MONTHLY_CEILING_CENTS = 1771200 // R17,712.00
const UIF_RATE = 0.01
const SDL_RATE = 0.01
const PRIMARY_REBATE_CENTS = 1782000 // R17,820 / year

// Annual brackets 2026/27 (taxable income in cents)
const BRACKETS = [
  { upTo: 24510000, rate: 0.18, base: 0 },
  { upTo: 38310000, rate: 0.26, base: 4411800 },
  { upTo: 53020000, rate: 0.31, base: 7999800 },
  { upTo: 69580000, rate: 0.36, base: 12559900 },
  { upTo: 88700000, rate: 0.39, base: 18521500 },
  { upTo: 187860000, rate: 0.41, base: 25978300 },
  { upTo: Infinity, rate: 0.45, base: 66633900 },
]

/** Luhn check for 13-digit SA ID numbers */
export function isValidSaId(id) {
  const s = String(id || '').replace(/\D/g, '')
  if (s.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 13; i++) {
    let d = parseInt(s[i], 10)
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** Rough age from SA ID (YYMMDD……) — returns null if invalid */
export function ageFromSaId(id, asOf = new Date()) {
  const s = String(id || '').replace(/\D/g, '')
  if (s.length < 6) return null
  const yy = parseInt(s.slice(0, 2), 10)
  const mm = parseInt(s.slice(2, 4), 10)
  const dd = parseInt(s.slice(4, 6), 10)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const year = yy <= (asOf.getFullYear() % 100) ? 2000 + yy : 1900 + yy
  const dob = new Date(year, mm - 1, dd)
  let age = asOf.getFullYear() - dob.getFullYear()
  const m = asOf.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

function annualPayeCents(annualTaxableCents, age = 30) {
  const income = Math.max(0, Math.round(annualTaxableCents))
  let tax = 0
  let prev = 0
  for (const b of BRACKETS) {
    if (income <= b.upTo) {
      tax = b.base + Math.round((income - prev) * b.rate)
      break
    }
    prev = b.upTo
  }
  let rebate = PRIMARY_REBATE_CENTS
  if (age >= 65) rebate += 976500 // secondary
  if (age >= 75) rebate += 324900 // tertiary
  return Math.max(0, tax - rebate)
}

/**
 * Process one employee for a monthly run.
 * @param {object} opts
 * @param {number} opts.baseSalaryCents - monthly cash salary
 * @param {number} [opts.transportAllowanceCents]
 * @param {number} [opts.otherTaxableCents]
 * @param {boolean} [opts.uifApplicable]
 * @param {number} [opts.age]
 * @param {number} [opts.etiMonth] - months already claimed (0–24)
 * @returns {object} breakdown in cents + rand helpers
 */
export function processProudlySaPayrollRun({
  baseSalaryCents = 0,
  transportAllowanceCents = 0,
  otherTaxableCents = 0,
  uifApplicable = true,
  age = 30,
  etiMonth = 0,
} = {}) {
  const cleanBase = Math.max(0, Math.round(Number(baseSalaryCents) || 0))
  const cleanTransport = Math.max(0, Math.round(Number(transportAllowanceCents) || 0))
  const cleanOther = Math.max(0, Math.round(Number(otherTaxableCents) || 0))

  // 80% of travel allowance typically included for PAYE (simplified)
  const transportForPaye = Math.round(cleanTransport * 0.8)
  const monthlyTaxable = cleanBase + transportForPaye + cleanOther
  const annualTaxable = monthlyTaxable * 12

  const annualPaye = annualPayeCents(annualTaxable, age)
  const monthlyPaye = Math.round(annualPaye / 12)

  // UIF employee 1% capped
  let uifEmployee = 0
  let uifEmployer = 0
  if (uifApplicable) {
    const uifBase = Math.min(cleanBase + cleanTransport + cleanOther, UIF_MONTHLY_CEILING_CENTS)
    uifEmployee = Math.round(uifBase * UIF_RATE)
    uifEmployer = uifEmployee
  }

  // SDL is employer-only; we expose the employee share of payroll for info
  const sdlEmployer = Math.round((cleanBase + cleanTransport + cleanOther) * SDL_RATE)

  // Simplified ETI (Employment Tax Incentive) — skeleton only
  // Real ETI has complex 24-month rolling, wage bands, and employer eligibility.
  let etiCents = 0
  if (age >= 18 && age <= 29 && monthlyTaxable >= 200000 && etiMonth < 24) {
    const isFirstYear = etiMonth < 12
    if (monthlyTaxable <= 450000) {
      const base = Math.round(monthlyTaxable * 0.5) // illustrative
      etiCents = isFirstYear ? Math.min(base, 150000) : Math.min(Math.round(base / 2), 75000)
    } else if (monthlyTaxable <= 650000) {
      etiCents = isFirstYear ? 100000 : 50000
    }
  }

  const netPay = monthlyTaxable - monthlyPaye - uifEmployee

  return {
    sarsSourceCode3601: cleanBase, // Income (basic salary)
    sarsSourceCode3701: cleanTransport, // Travel allowance
    sarsSourceCode4102: monthlyPaye, // PAYE
    sarsSourceCode4118: etiCents, // ETI (employer credit)
    uifEmployeeCents: uifEmployee,
    uifEmployerCents: uifEmployer,
    sdlEmployerCents: sdlEmployer,
    monthlyTaxableCents: monthlyTaxable,
    finalNetPayDisbursement: Math.max(0, netPay),
    // convenience rand values
    grossR: monthlyTaxable / 100,
    payeR: monthlyPaye / 100,
    uifR: uifEmployee / 100,
    netR: Math.max(0, netPay) / 100,
    etiR: etiCents / 100,
    sdlR: sdlEmployer / 100,
  }
}

/** Convert rand amount to cents safely */
export function toCents(rand) {
  return Math.round((Number(rand) || 0) * 100)
}

export function fromCents(cents) {
  return (Math.round(Number(cents) || 0) / 100)
}
