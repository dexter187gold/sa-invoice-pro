import test from 'node:test'
import assert from 'node:assert/strict'
import { CUSTOMER_ACCOUNT_CATEGORIES, CUSTOMER_PAYMENT_TERMS, customerCategoryLabel } from '../src/lib/customerCategories.js'

test('customer account categories provide safe default terms and credit policy', () => {
  assert.ok(CUSTOMER_ACCOUNT_CATEGORIES.length >= 7)
  for (const category of CUSTOMER_ACCOUNT_CATEGORIES) {
    assert.ok(category.id)
    assert.ok(category.label)
    assert.ok(CUSTOMER_PAYMENT_TERMS.includes(category.defaultTerms))
    assert.equal(typeof category.creditAllowed, 'boolean')
  }
})

test('cash customers default to COD and no credit', () => {
  const cash = CUSTOMER_ACCOUNT_CATEGORIES.find((category) => category.id === 'cash-customer')
  assert.equal(cash.defaultTerms, 'COD')
  assert.equal(cash.creditAllowed, false)
})

test('unknown categories display a safe default label', () => {
  assert.equal(customerCategoryLabel('not-a-category'), 'Individual')
  assert.equal(customerCategoryLabel('company'), 'Company / corporate')
})
