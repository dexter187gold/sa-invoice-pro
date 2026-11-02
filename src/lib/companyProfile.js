/** Shared company / account profile model for Setup + Settings */
import { getBusinessType, businessTypeOptions } from './businessTypes.js'

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
]

export const BANK_ACCOUNT_TYPES = ['Cheque / current', 'Savings', 'Transmission', 'Business', 'Other']

export const PAYMENT_TERM_PRESETS = [
  'Due on receipt',
  'Net 7 days',
  'Net 14 days',
  'Net 30 days',
  '50% deposit, balance on completion',
  'COD',
]

export const MODULE_PROFILE_FIELDS = {
  it_msp: [
    { key: 'workshopHours', label: 'Workshop / support hours', placeholder: 'Mon–Fri 08:00–17:00' },
    { key: 'supportEmail', label: 'Support email', placeholder: 'support@…' },
    { key: 'slaNote', label: 'Default SLA note', placeholder: 'e.g. Response within 4 business hours' },
  ],
  retail: [
    { key: 'storeHours', label: 'Trading hours', placeholder: 'Mon–Sat 08:00–18:00' },
    { key: 'tillLabel', label: 'Store / till label', placeholder: 'Main counter' },
    { key: 'returnsPolicy', label: 'Returns policy (short)', placeholder: '7-day exchange with slip' },
  ],
  trades: [
    { key: 'serviceArea', label: 'Service area', placeholder: 'Metro + 50 km' },
    { key: 'calloutNote', label: 'Call-out note', placeholder: 'Call-out fee waived if work accepted' },
    { key: 'tradeLicence', label: 'Trade / CIDB ref (optional)', placeholder: '' },
  ],
  automotive: [
    { key: 'workshopHours', label: 'Bay hours', placeholder: 'Mon–Fri 07:30–17:00' },
    { key: 'bayCount', label: 'Number of bays', placeholder: '3' },
    { key: 'aaOrInsurance', label: 'Insurance / AA notes', placeholder: 'Accepted insurers…' },
  ],
  consulting: [
    { key: 'practiceNumber', label: 'Practice / membership no.', placeholder: '' },
    { key: 'specialties', label: 'Specialties', placeholder: 'Strategy, ops, IT advisory' },
    { key: 'engagementNote', label: 'Default engagement note', placeholder: 'SOW required before work starts' },
  ],
}

export function blankCompanyForm(partial = {}) {
  return {
    name: '',
    tradingName: '',
    registrationNumber: '',
    taxNumber: '',
    vatNumber: '',
    email: '',
    phone: '',
    altPhone: '',
    whatsapp: '',
    website: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    businessType: 'it_msp',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    bankAccountType: 'Business',
    paymentTerms: 'Net 30 days',
    invoiceFooter: '',
    payeReference: '',
    uifReference: '',
    sdlReference: '',
    workshopHours: '',
    supportEmail: '',
    slaNote: '',
    storeHours: '',
    tillLabel: '',
    returnsPolicy: '',
    serviceArea: '',
    calloutNote: '',
    tradeLicence: '',
    bayCount: '',
    aaOrInsurance: '',
    practiceNumber: '',
    specialties: '',
    engagementNote: '',
    ...partial,
  }
}

export function companyToForm(company) {
  const base = blankCompanyForm()
  if (!company || typeof company !== 'object') {
    return { ...base, businessType: getBusinessType(null).id }
  }
  const out = { ...base }
  for (const key of Object.keys(base)) {
    if (company[key] != null && company[key] !== '') out[key] = company[key]
  }
  out.businessType = getBusinessType(company.businessType).id
  return out
}

export function formToCompanyPayload(form) {
  const name = String(form.name || '').trim()
  const payload = { ...form, name }
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string') payload[k] = v.trim()
  }
  return payload
}

export function validateCompanyForm(form, { requireContact = false } = {}) {
  const errors = []
  if (!String(form.name || '').trim()) errors.push('Business / legal name is required')
  if (requireContact && !String(form.email || '').trim() && !String(form.phone || '').trim()) {
    errors.push('Add at least an email or phone so clients can reach you')
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email).trim())) {
    errors.push('Email looks invalid')
  }
  if (form.vatNumber && String(form.vatNumber).replace(/\D/g, '').length > 0) {
    const digits = String(form.vatNumber).replace(/\D/g, '')
    if (digits.length !== 10) errors.push('SA VAT numbers are usually 10 digits')
  }
  return errors
}

export function typeOptions() {
  return businessTypeOptions()
}

export function moduleFieldsForType(businessTypeId) {
  const type = getBusinessType(businessTypeId)
  return MODULE_PROFILE_FIELDS[type.id] || []
}

export function profileCompleteness(form) {
  const checks = [
    form.name,
    form.email || form.phone,
    form.address || form.city,
    form.businessType,
    form.bankName && form.accountNumber,
    form.vatNumber || form.registrationNumber,
  ]
  const done = checks.filter(Boolean).length
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
}
