import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Pure helpers mirrored for unit isolation (no browser)
function toWaNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length >= 9) d = '27' + d.slice(1)
  if (d.length < 10) return ''
  return d
}

function buildJobStatusMessage(ticket, company) {
  const name = ticket?.contactName || 'there'
  const co = company?.name || 'SA Invoice Pro'
  const st = ticket?.status || 'open'
  const label =
    ({ open: 'Open', in_progress: 'In progress', waiting: 'Waiting on you', resolved: 'Resolved', closed: 'Closed' })[st] ||
    st
  return [
    `Hi ${name}, update from *${co}* on your job *${ticket?.title || ticket?.subject || ticket?.id || ''}*:`,
    `Status: *${label}*`,
    ticket?.workDone ? `Work done: ${String(ticket.workDone).slice(0, 280)}` : '',
    'Reply here if you have questions — we will keep you posted.',
  ]
    .filter(Boolean)
    .join('\n')
}

describe('whatsapp helpers', () => {
  it('normalises ZA mobile to 27…', () => {
    assert.equal(toWaNumber('0821234567'), '27821234567')
    assert.equal(toWaNumber('+27 82 123 4567'), '27821234567')
  })
  it('builds job status with bold markers', () => {
    const msg = buildJobStatusMessage(
      { title: 'Screen repair', status: 'in_progress', contactName: 'Thabo', workDone: 'Glass replaced' },
      { name: 'Bench Co' },
    )
    assert.match(msg, /\*Bench Co\*/)
    assert.match(msg, /\*In progress\*/)
    assert.match(msg, /Glass replaced/)
  })
})
