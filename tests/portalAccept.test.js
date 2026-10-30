import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildQuoteDecision,
  applyPortalDecisionLocally,
  queuePortalDecision,
  listQueuedPortalDecisions,
  clearQueuedPortalDecisions,
  normalizeQuoteStatus,
  canDecideQuote,
  portalQuoteSummary,
} from '../src/lib/portalQuote.js'

test('P4 simulate portal Accept updates quote status locally', () => {
  const quotes = [
    { id: 'q1', number: 'Q-100', status: 'sent', total: 1500 },
    { id: 'q2', number: 'Q-101', status: 'sent', total: 900 },
  ]
  assert.equal(canDecideQuote(quotes[0]), true)
  const decision = buildQuoteDecision(quotes[0], 'accept', 'Looks good')
  assert.equal(decision.status, 'accepted')
  assert.equal(decision.action, 'approve')

  const next = applyPortalDecisionLocally(quotes, 'q1', 'approve', 'Looks good')
  assert.equal(normalizeQuoteStatus(next[0].status), 'accepted')
  assert.equal(next[0].portalNote, 'Looks good')
  assert.equal(next[1].status, 'sent')
})

test('P4 simulate portal Reject', () => {
  const quotes = [{ id: 'q1', status: 'sent' }]
  const next = applyPortalDecisionLocally(quotes, 'q1', 'reject', 'Too expensive')
  assert.equal(normalizeQuoteStatus(next[0].status), 'rejected')
})

test('P4 queue decision for desk write-back when offline', () => {
  clearQueuedPortalDecisions()
  const entry = queuePortalDecision({
    token: 'sim-token',
    quoteId: 'q1',
    action: 'approve',
    note: 'offline accept',
    status: 'accepted',
  })
  assert.equal(entry.action, 'approve')
  const list = listQueuedPortalDecisions()
  assert.ok(list.length >= 1)
  assert.equal(list[0].quoteId, 'q1')
  clearQueuedPortalDecisions()
  assert.equal(listQueuedPortalDecisions().length, 0)
})

test('P4 portalQuoteSummary counts', () => {
  const s = portalQuoteSummary([
    { status: 'accepted' },
    { status: 'rejected' },
    { status: 'sent' },
    { status: 'converted' },
  ])
  assert.equal(s.total, 4)
  assert.equal(s.accepted, 2)
  assert.equal(s.rejected, 1)
  assert.equal(s.pending, 1 macro)
})
