import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  acceptedQuotesAwaitingConvert,
  declinedQuotesRecent,
  deskNextActions,
  jobsPastPromise,
} from '../src/lib/deskPulse.js'

describe('deskPulse', () => {
  it('acceptedQuotesAwaitingConvert', () => {
    const list = acceptedQuotesAwaitingConvert([
      { id: '1', status: 'accepted' },
      { id: '2', status: 'converted', portalDecision: 'accepted' },
      { id: '3', status: 'sent', portalDecision: 'accepted' },
      { id: '4', status: 'draft' },
    ])
    assert.equal(list.length, 2)
    assert.ok(list.some((q) => q.id === '1'))
    assert.ok(list.some((q) => q.id === '3'))
  })

  it('declinedQuotesRecent', () => {
    const list = declinedQuotesRecent([
      { id: '1', status: 'rejected', portalDecisionAt: new Date().toISOString() },
      { id: '2', status: 'rejected', portalDecisionAt: '2020-01-01' },
    ])
    assert.equal(list.length, 1)
    assert.equal(list[0].id, '1')
  })

  it('jobsPastPromise', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    const future = new Date(Date.now() + 86400000).toISOString()
    const list = jobsPastPromise([
      { id: 'a', status: 'open', promisedAt: past },
      { id: 'b', status: 'open', promisedAt: future },
      { id: 'c', status: 'closed', promisedAt: past },
    ])
    assert.equal(list.length, 1)
    assert.equal(list[0].id, 'a')
  })

  it('deskNextActions ranks convert first', () => {
    const actions = deskNextActions({
      quotes: [{ id: '1', status: 'accepted' }],
      tickets: [],
      invoices: [{ id: 'i', status: 'unpaid' }],
    })
    assert.ok(actions[0].id === 'convert_quotes')
  })
})
