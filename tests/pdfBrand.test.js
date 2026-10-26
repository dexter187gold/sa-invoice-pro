import test from 'node:test'
import assert from 'node:assert/strict'
import { hexToRgb, pdfFooterLine } from '../src/lib/pdfBrand.js'
import {
  buildQuoteDecision,
  canDecideQuote,
  normalizeQuoteStatus,
  applyPortalDecisionLocally,
} from '../src/lib/portalQuote.js'

test('hexToRgb parses green', () => {
  assert.deepEqual(hexToRgb('#007A4D'), [0, 122, 77])
})

test('hexToRgb fallback on bad input', () => {
  assert.deepEqual(hexToRgb('nope'), [0, 122, 77])
})

test('pdfFooterLine string', () => {
  const s = pdfFooterLine({ brandName: 'Cape Tech', hidePoweredBy: true })
  assert.equal(s, 'Cape Tech')
  const s2 = pdfFooterLine({ brandName: 'Cape Tech', hidePoweredBy: false })
  assert.match(s2, /powered by/i)
})

test('portal decision offline helpers', () => {
  assert.equal(normalizeQuoteStatus('approved'), 'accepted')
  assert.equal(canDecideQuote({ status: 'sent' }), true)
  const d = buildQuoteDecision({ id: '1', status: 'sent' }, 'approve', 'go')
  assert.equal(d.status, 'accepted')
  assert.equal(d.portalNote, 'go')
  const { updated } = applyPortalDecisionLocally([{ id: '1', status: 'sent' }], '1', 'reject', '')
  assert.equal(updated.status, 'rejected')
})
