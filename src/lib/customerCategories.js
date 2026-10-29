export const CUSTOMER_ACCOUNT_CATEGORIES = [
  { id: 'individual', label: 'Individual', defaultTerms: 'Due on receipt', creditAllowed: false },
  { id: 'small-business', label: 'Small business', defaultTerms: '7 days', creditAllowed: true },
  { id: 'company', label: 'Company / corporate', defaultTerms: '30 days', creditAllowed: true },
  { id: 'government', label: 'Government / public sector', defaultTerms: '30 days', creditAllowed: true },
  { id: 'non-profit', label: 'Non-profit organisation', defaultTerms: '30 days', creditAllowed: true },
  { id: 'reseller', label: 'Reseller / trade', defaultTerms: '30 days', creditAllowed: true },
  { id: 'cash-customer', label: 'Cash customer', defaultTerms: 'COD', creditAllowed: false },
  { id: 'internal', label: 'Internal / staff', defaultTerms: 'Due on receipt', creditAllowed: false },
]
export const CUSTOMER_PAYMENT_TERMS = ['COD', 'Due on receipt', '7 days', '14 days', '30 days', '60 days', 'Custom']
export function customerCategoryLabel(id) {
  return CUSTOMER_ACCOUNT_CATEGORIES.find((item) => item.id === id)?.label || 'Individual'
}
