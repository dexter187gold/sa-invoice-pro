import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canConvertQuote } from '../src/lib/quoteConvert.js'

describe('quoteConvert', () => {
  it('allows accepted and portal accepted', () => {
    assert.equal(canConvertQuote({ status: 'accepted' }), true)
    assert.equal(canConvertQuote({ status: 'sent', portalDecision: 'accepted' }), true)
    assert.equal(canConvertQuote({ status: 'converted' }), false)
    assert.equal(canConvertQuote({ status: 'rejected' }), false)
  })
})
