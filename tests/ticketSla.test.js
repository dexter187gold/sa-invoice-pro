import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeTicketSla, ticketsSlaRisk } from '../src/lib/ticketSla.js'

describe('ticketSla', () => {
  it('marks past promise overdue', () => {
    const past = new Date(Date.now() - 5 * 3600000).toISOString()
    const s = computeTicketSla({ status: 'open', promisedAt: past })
    assert.equal(s.overdue, true)
    assert.equal(s.cls, 'sla-bad')
  })

  it('done tickets ok', () => {
    const s = computeTicketSla({ status: 'resolved', promisedAt: '2020-01-01' })
    assert.equal(s.cls, 'sla-ok')
    assert.equal(s.overdue, false)
  })

  it('ticketsSlaRisk filters', () => {
    const past = new Date(Date.now() - 3600000).toISOString()
    const risk = ticketsSlaRisk([
      { id: '1', status: 'open', promisedAt: past },
      { id: '2', status: 'open', promisedAt: new Date(Date.now() + 86400000).toISOString() },
    ])
    assert.equal(risk.length, 1)
    assert.equal(risk[0].id, '1')
  })
})
