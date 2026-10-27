import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/worker.js'

test('assistant API rejects unsupported methods', async () => {
  const response = await worker.fetch(new Request('https://app.test/api/assistant'), { AI: { run: async () => ({ response: 'unused' }) } })
  assert.equal(response.status, 405)
})

test('assistant API rejects cross-origin requests', async () => {
  const response = await worker.fetch(new Request('https://app.test/api/assistant', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  }), {})
  assert.equal(response.status, 403)
})

test('assistant API requires JSON', async () => {
  const response = await worker.fetch(new Request('https://app.test/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'hello',
  }), {})
  assert.equal(response.status, 415)
})

test('assistant API requires a valid cloud account token', async () => {
  const response = await worker.fetch(new Request('https://app.test/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'How do I create an invoice?' }] }),
  }), {})
  assert.equal(response.status, 401)
})

test('non-API paths continue to use the static SPA assets', async () => {
  const response = await worker.fetch(new Request('https://app.test/support'), {
    ASSETS: { fetch: async () => new Response('spa shell', { status: 200 }) },
  })
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'spa shell')
})
