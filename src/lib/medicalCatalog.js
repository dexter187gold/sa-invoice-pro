/** Medical / Clinic / Allied health - SA SME presets (ZAR, indicative). */

export const MEDICAL_ACCOUNT_TYPES = [
  'Private / cash',
  'Medical aid',
  'Net 7',
  'Net 30',
  'Package / course',
]

export const MEDICAL_SERVICE_PRESETS = [
  { name: 'Consultation - first visit', price: 650, category: 'Consult', sku: 'MED-CON-1', tags: ['medical'] },
  { name: 'Consultation - follow-up', price: 450, category: 'Consult', sku: 'MED-CON-F', tags: ['medical'] },
  { name: 'Procedure - minor (from)', price: 850, category: 'Procedure', sku: 'MED-PROC', tags: ['medical'] },
  { name: 'Injection / administration', price: 180, category: 'Procedure', sku: 'MED-INJ', tags: ['medical'] },
  { name: 'Physio session - 30 min', price: 480, category: 'Allied', sku: 'MED-PHY-30', tags: ['medical'] },
  { name: 'Physio session - 45 min', price: 620, category: 'Allied', sku: 'MED-PHY-45', tags: ['medical'] },
  { name: 'Report / medical certificate', price: 350, category: 'Admin', sku: 'MED-CERT', tags: ['medical'] },
  { name: 'Telehealth consult', price: 400, category: 'Consult', sku: 'MED-TELE', tags: ['medical'] },
]

export const MEDICAL_PRODUCT_PRESETS = [
  { name: 'Consumable - dressing pack', price: 85, category: 'Consumables', sku: 'MED-DRS', tags: ['medical'] },
  { name: 'Consumable - syringes (pack)', price: 45, category: 'Consumables', sku: 'MED-SYR', tags: ['medical'] },
]

export const MEDICAL_DOCUMENT_STUBS = [
  {
    id: 'med_consent',
    title: 'Informed consent',
    purpose: 'Record informed consent for examination or procedure.',
    scope: 'Patient details, procedure, risks discussed, consent signature, practitioner.',
  },
  {
    id: 'med_sick_note',
    title: 'Sick note / medical certificate',
    purpose: 'Issue a certificate of unfitness or fitness for work/school.',
    scope: 'Patient, dates, diagnosis code optional, practitioner details, stamp.',
  },
  {
    id: 'med_referral',
    title: 'Referral letter',
    purpose: 'Refer a patient to another practitioner or facility.',
    scope: 'Clinical summary, reason for referral, urgency, contact.',
  },
]
