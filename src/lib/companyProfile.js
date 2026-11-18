/** Company profile form model + validation for SA businesses. */
import { getBusinessType } from './businessTypes.js'

const EXTRA_BY_TYPE = {
  it_msp: [
    { key: 'supportEmail', label: 'Support email', placeholder: 'support@…' },
    { key: 'slaNote', label: 'Default SLA note (short)', placeholder: '4h response · next-business-day onsite' },
  ],
  retail: [
    { key: 'storeHours', label: 'Store hours', placeholder: 'Mon–Fri 08:00–17:00' },
    { key: 'tillLabel', label: 'Till / branch label', placeholder: 'Main counter' },
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
    logoDataUrl: '',
    logoName: '',
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

export function validateCompanyForm(form) {
  const errors = []
  if (!String(form?.name || '').trim()) errors.push('Company name is required')
  return errors
}

export function extraFieldsForBusinessType(businessType) {
  const id = getBusinessType(businessType).id
  return EXTRA_BY_TYPE[id] || []
}
