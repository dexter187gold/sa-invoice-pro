import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeQuoteStatus,
  canDecideQuote,
  buildQuoteDecision,
  extractPortalToken,
  portalQuoteSummary,
  applyPortalDecisionLocally,
} from '../src/lib/portalQuote.js'

test('normalizeQuoteStatus maps aliases', () => {
  assert.equal(normalizeQuoteStatus('approved'), 'accepted')
  assert.equal(normalizeQuoteStatus('declined'), 'rejected')
  assert.equal(normalizeQuoteStatus('sent'), 'sent')
})

test('canDecideQuote only for draft/sent', () => {
  assert.equal(canDecideQuote({ status: 'draft' }), true)
  assert.equal(canDecideQuote({ status: 'sent' }), true)
  assert.equal(canDecideQuote({ status: 'accepted' }), false)
  assert.equal(canDecideQuote({ status: 'converted' }), false)
})

test('buildQuoteDecision approve sets accepted + note', () => {
  const q = buildQuoteDecision({ id: '1', number: 'QT-1', status: 'sent' }, 'approve', 'Start Monday')
  assert.equal(q.status, 'accepted')
  assert.equal(q.portalDecision, 'accepted')
  assert.equal(q.portalNote, 'Start Monday')
  assert.ok(q.portalDecisionAt)
})

test('buildQuoteDecision reject', () => {
  const q = buildQuoteDecision({ id: '1', status: 'draft' }, 'reject', '')
  assert.equal(q.status, 'rejected')
  assert.equal(q.portalDecision, 'rejected')
})

test('extractPortalToken from query and path', () => {
  assert.equal(extractPortalToken('?token=abc', '/portal'), 'abc')
  assert.equal(extractPortalToken('?t=xyz', '/x'), 'xyz')
  assert.equal(extractPortalToken('', '/portal/tok123'), 'tok123')
})

test('portalQuoteSummary counts', () => {
  const s = portalQuoteSummary([
    { status: 'sent' },
    { status: 'accepted' },
    { status: 'rejected' },
    { status: 'converted' },
  ])
  assert.equal(s.total, 4)
  assert.equal(s.open, 1)
  assert.equal(s.accepted, 1)
  assert.equal(s.rejected, 1)
  assert.equal(s.converted, 1)
})

test('applyPortalDecisionLocally updates matching quote', () => {
  const { updated, quotes } = applyPortalDecisionLocally(
    [{ id: 'a', status: 'sent' }, { id: 'b', status: 'draft' }],
    'a',
    'approve',
    'ok',
  )
  assert.equal(updated.status, 'accepted')
  assert.equal(quotes[0].status, 'accepted')
  assert.equal(quotes[1].status, 'draft')
})
