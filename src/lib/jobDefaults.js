/** Default job-card fields by business type */
import { getBusinessType } from './businessTypes.js'

const DEFAULTS = {
  it_msp: { supportType: 'workshop', category: 'IT support', priority: 'normal' },
  trades: { supportType: 'onsite', category: 'Call-out', priority: 'normal' },
  automotive: { supportType: 'workshop', category: 'Vehicle', priority: 'normal' },
  cleaning: { supportType: 'onsite', category: 'Site', priority: 'normal' },
  logistics: { supportType: 'onsite', category: 'Delivery', priority: 'normal' },
  security: { supportType: 'onsite', category: 'Site', priority: 'high' },
  medical: { supportType: 'onsite', category: 'Appointment', priority: 'normal' },
  beauty: { supportType: 'workshop', category: 'Booking', priority: 'normal' },
  consulting: { supportType: 'remote', category: 'Engagement', priority: 'normal' },
}

export function emptyJobForm(company) {
  const type = getBusinessType(company?.businessType)
  const d = DEFAULTS[type.id] || { supportType: 'remote', category: '', priority: 'normal' }
  return {
    title: '',
    clientId: '',
    status: 'open',
    priority: d.priority,
    notes: '',
    description: '',
    workDone: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    category: d.category,
    dueDate: '',
    assignee: '',
    supportType: d.supportType,
  }
}
