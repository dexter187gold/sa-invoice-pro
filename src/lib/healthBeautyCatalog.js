/** Health / Beauty / Salon - SA SME presets (ZAR, indicative). */

export const HEALTH_BEAUTY_ACCOUNT_TYPES = [
  'Walk-in',
  'Appointment',
  'Package / course',
  'Net 7',
  'Pay after treatment',
]

export const HEALTH_BEAUTY_SERVICE_PRESETS = [
  { name: 'Consultation', price: 250, category: 'Consult', sku: 'HB-CON', tags: ['health', 'beauty'] },
  { name: 'Haircut - ladies', price: 280, category: 'Hair', sku: 'HB-CUT-L', tags: ['beauty'] },
  { name: 'Haircut - gents', price: 150, category: 'Hair', sku: 'HB-CUT-G', tags: ['beauty'] },
  { name: 'Colour / highlights (from)', price: 650, category: 'Hair', sku: 'HB-COL', tags: ['beauty'] },
  { name: 'Manicure', price: 180, category: 'Nails', sku: 'HB-MAN', tags: ['beauty'] },
  { name: 'Pedicure', price: 220, category: 'Nails', sku: 'HB-PED', tags: ['beauty'] },
  { name: 'Facial - classic', price: 450, category: 'Skin', sku: 'HB-FAC', tags: ['beauty'] },
  { name: 'Massage - 30 min', price: 350, category: 'Body', sku: 'HB-MSG-30', tags: ['health'] },
  { name: 'Massage - 60 min', price: 550, category: 'Body', sku: 'HB-MSG-60', tags: ['health'] },
]

export const HEALTH_BEAUTY_PRODUCT_PRESETS = [
  { name: 'Retail product - shampoo (unit)', price: 120, category: 'Retail', sku: 'HB-SHAM', tags: ['beauty'] },
  { name: 'Retail product - serum (unit)', price: 280, category: 'Retail', sku: 'HB-SER', tags: ['beauty'] },
]

export const HEALTH_BEAUTY_DOCUMENT_STUBS = [
  {
    id: 'hb_consent',
    title: 'Treatment consent / patch-test note',
    purpose: 'Record client consent and any patch-test or contraindications before treatment.',
    scope: 'Client details, treatment, allergies, consent, therapist sign-off.',
  },
  {
    id: 'hb_aftercare',
    title: 'Aftercare instructions',
    purpose: 'Give the client clear aftercare steps post-treatment.',
    scope: 'Do / avoid list, products used, follow-up booking.',
  },
]
