import { test, expect } from '@playwright/test'
import { injectSession, seedIndexedDbCompany, expectPageAlive, unlockVisibility } from './helpers.js'

test.describe('Quotes desk', () => {
  test('quotes route loads with session', async ({ page }) => {
    await injectSession(page)
    // Open origin, seed company, then navigate to quotes
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await seedIndexedDbCompany(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/quotes')
    await page.waitForTimeout(1200)
    const body = await expectPageAlive(page)
    // Logged-in desk or redirect still must not crash
    expect(/quote|convert|portal|COD|login|workspace|Loading/i.test(body)).toBeTruthy()
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })

  test('portal payments section does not crash', async ({ page }) => {
    await unlockVisibility(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/portal/demo-token/payments')
    await page.waitForTimeout(800)
    await expectPageAlive(page)
    const fatal = errors.filter((e) => /Cannot find module|is not defined|Unexpected token/i.test(e))
    expect(fatal, fatal.join('\n')).toHaveLength(0)
  })
})
