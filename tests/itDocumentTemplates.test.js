import test from 'node:test'
import assert from 'node:assert/strict'
import { IT_DOCUMENT_TEMPLATES, getITDocumentTemplate, searchITDocumentTemplates } from '../src/lib/itDocumentTemplates.js'

test('IT document library contains at least 50 unique templates', () => {
  assert.ok(IT_DOCUMENT_TEMPLATES.length >= 50)
  assert.equal(new Set(IT_DOCUMENT_TEMPLATES.map((item) => item.id)).size, IT_DOCUMENT_TEMPLATES.length)
})

test('every IT template has a purpose, scope and detailed approval-ready sections', () => {
  for (const item of IT_DOCUMENT_TEMPLATES) {
    assert.ok(item.title.length > 5, item.id)
    assert.ok(item.purpose.length > 30, item.id)
    assert.ok(item.scope.length > 30, item.id)
    assert.ok(item.sections.length >= 10, item.id)
    assert.ok(item.sections.some((section) => /approval/i.test(section.heading)), item.id)
  }
})

test('template search filters by category and relevant text', () => {
  assert.ok(searchITDocumentTemplates('firewall').some((item) => item.id === 'firewall_change'))
  assert.ok(searchITDocumentTemplates('', 'Privacy').length > 0)
  assert.equal(getITDocumentTemplate('missing-id').id, IT_DOCUMENT_TEMPLATES[0].id)
})
